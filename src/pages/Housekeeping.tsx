import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/hooks/use-app-state";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  canUseBackend,
  createHousekeepingTask,
  deleteHousekeepingTask,
  fetchHousekeepingTasks,
  type HousekeepingPriority,
  type HousekeepingStatus,
  type HousekeepingTaskRecord,
  updateHousekeepingTask,
} from "@/lib/hotel-api";

const initialTasks: HousekeepingTaskRecord[] = [
  { id: "1", room: "101", task: "Deep Clean", assignee: "Maria G.", priority: "High", status: "In Progress" },
  { id: "2", room: "103", task: "Turnover Clean", assignee: "John D.", priority: "Medium", status: "Pending" },
  { id: "3", room: "207", task: "Linen Change", assignee: "Maria G.", priority: "Low", status: "Completed" },
  { id: "4", room: "301", task: "Deep Clean", assignee: "Sarah K.", priority: "High", status: "Pending" },
  { id: "5", room: "205", task: "Maintenance Fix", assignee: "Tom R.", priority: "High", status: "In Progress" },
  { id: "6", room: "402", task: "Turnover Clean", assignee: "John D.", priority: "Medium", status: "Completed" },
];

const priorityColors: Record<HousekeepingPriority, string> = {
  High: "bg-destructive/10 text-destructive border-destructive/20",
  Medium: "bg-warning/10 text-warning border-warning/20",
  Low: "bg-success/10 text-success border-success/20",
};

const statusColors: Record<HousekeepingStatus, string> = {
  "In Progress": "bg-primary/10 text-primary border-primary/20",
  Pending: "bg-warning/10 text-warning border-warning/20",
  Completed: "bg-success/10 text-success border-success/20",
};

const Housekeeping = () => {
  const [tasks, setTasks] = useAppState<HousekeepingTaskRecord[]>("rm_housekeeping_tasks", initialTasks);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<HousekeepingTaskRecord | null>(null);
  const [newTask, setNewTask] = useState<{
    room: string;
    task: string;
    assignee: string;
    priority: HousekeepingPriority;
    status: HousekeepingStatus;
  }>({
    room: "",
    task: "",
    assignee: "",
    priority: "Medium",
    status: "Pending",
  });

  const canSubmitNewTask =
    newTask.room.trim().length > 0 &&
    newTask.task.trim().length > 0 &&
    newTask.assignee.trim().length > 0;

  useEffect(() => {
    if (!canUseBackend()) return;

    let cancelled = false;

    (async () => {
      const remoteTasks = await fetchHousekeepingTasks();
      if (cancelled) return;
      setTasks(remoteTasks);
    })();

    return () => {
      cancelled = true;
    };
  }, [setTasks]);

  const summary = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let completed = 0;

    for (const t of tasks) {
      if (t.status === "Pending") pending += 1;
      else if (t.status === "In Progress") inProgress += 1;
      else if (t.status === "Completed") completed += 1;
    }

    return { pending, inProgress, completed };
  }, [tasks]);

  const handleCreateTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmitNewTask || isCreatingTask) return;

    setIsCreatingTask(true);

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (crypto as any).randomUUID()
        : String(Date.now());

    const next: HousekeepingTaskRecord = {
      id,
      room: newTask.room.trim(),
      task: newTask.task.trim(),
      assignee: newTask.assignee.trim(),
      priority: newTask.priority,
      status: newTask.status,
    };

    if (canUseBackend()) {
      const isCreated = await createHousekeepingTask(next);
      if (!isCreated) {
        setIsCreatingTask(false);
        toast({
          title: "Task save failed",
          description: "Unable to save housekeeping task in backend. Please re-login and try again.",
          variant: "destructive",
        });
        return;
      }
    }

    setTasks((prev) => [next, ...prev]);

    setAddOpen(false);
    setNewTask({ room: "", task: "", assignee: "", priority: "Medium", status: "Pending" });

    toast({
      title: "Task created",
      description: `Housekeeping task for room ${next.room} has been created successfully.`,
    });

    setIsCreatingTask(false);
  };

  const handleSaveTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editTask || isSavingTask) return;

    setIsSavingTask(true);
    const previousTasks = tasks;
    setTasks((prev) => prev.map((task) => (task.id === editTask.id ? editTask : task)));

    if (canUseBackend()) {
      const ok = await updateHousekeepingTask(editTask);
      if (!ok) {
        setTasks(previousTasks);
        setIsSavingTask(false);
        toast({ title: "Update failed", description: "Unable to update task in backend.", variant: "destructive" });
        return;
      }
    }

    setEditOpen(false);
    setEditTask(null);
    toast({ title: "Task updated", description: `Task for room ${editTask.room} updated successfully.` });
    setIsSavingTask(false);
  };

  const handleDeleteTask = async (task: HousekeepingTaskRecord) => {
    if (busyTaskId) return;
    if (!window.confirm(`Delete housekeeping task for room ${task.room}?`)) return;

    const previousTasks = tasks;
    setBusyTaskId(task.id);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));

    if (canUseBackend()) {
      const ok = await deleteHousekeepingTask(task.id);
      if (!ok) {
        setTasks(previousTasks);
        setBusyTaskId(null);
        toast({ title: "Delete failed", description: "Unable to delete task from backend.", variant: "destructive" });
        return;
      }
    }

    toast({ title: "Task deleted", description: `Task for room ${task.room} deleted successfully.` });
    setBusyTaskId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Housekeeping</h1>
          <p className="text-sm text-muted-foreground">Task assignments and room cleaning status</p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Sparkles className="h-4 w-4" /> New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New Housekeeping Task</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hk-room">Room</Label>
                  <Input
                    id="hk-room"
                    placeholder="e.g. 103"
                    value={newTask.room}
                    onChange={(e) => setNewTask((prev) => ({ ...prev, room: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hk-assignee">Assignee</Label>
                  <Input
                    id="hk-assignee"
                    placeholder="e.g. Maria G."
                    value={newTask.assignee}
                    onChange={(e) => setNewTask((prev) => ({ ...prev, assignee: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hk-task">Task</Label>
                <Input
                  id="hk-task"
                  placeholder="e.g. Turnover Clean"
                  value={newTask.task}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, task: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value) => setNewTask((prev) => ({ ...prev, priority: value as HousekeepingPriority }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={newTask.status}
                    onValueChange={(value) => setNewTask((prev) => ({ ...prev, status: value as HousekeepingStatus }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmitNewTask || isCreatingTask}>
                  {isCreatingTask ? "Adding..." : "Add Task"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setEditTask(null);
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Housekeeping Task</DialogTitle>
            </DialogHeader>
            {editTask && (
              <form onSubmit={handleSaveTask} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-hk-room">Room</Label>
                    <Input
                      id="edit-hk-room"
                      value={editTask.room}
                      onChange={(e) => setEditTask((prev) => (prev ? { ...prev, room: e.target.value } : prev))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-hk-assignee">Assignee</Label>
                    <Input
                      id="edit-hk-assignee"
                      value={editTask.assignee}
                      onChange={(e) => setEditTask((prev) => (prev ? { ...prev, assignee: e.target.value } : prev))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-hk-task">Task</Label>
                  <Input
                    id="edit-hk-task"
                    value={editTask.task}
                    onChange={(e) => setEditTask((prev) => (prev ? { ...prev, task: e.target.value } : prev))}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSavingTask}>{isSavingTask ? "Saving..." : "Save"}</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {[
          { label: "Pending", count: summary.pending, color: "text-warning" },
          { label: "In Progress", count: summary.inProgress, color: "text-primary" },
          { label: "Completed", count: summary.completed, color: "text-success" },
        ].map((s) => (
          <Card key={s.label} className="border-none shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <CheckCircle2 className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{s.count}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-5 py-3 font-medium">Room</th>
                <th className="px-5 py-3 font-medium">Task</th>
                <th className="px-5 py-3 font-medium">Assignee</th>
                <th className="px-5 py-3 font-medium">Priority</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground">Room {t.room}</td>
                  <td className="px-5 py-3 text-foreground">{t.task}</td>
                  <td className="px-5 py-3 text-muted-foreground">{t.assignee}</td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className={priorityColors[t.priority]}>
                      {t.priority}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className={statusColors[t.status]}>
                      {t.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => { setEditTask(t); setEditOpen(true); }}>
                        Edit
                      </Button>
                      <Button type="button" size="sm" variant="destructive" disabled={busyTaskId === t.id} onClick={() => void handleDeleteTask(t)}>
                        {busyTaskId === t.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Housekeeping;
