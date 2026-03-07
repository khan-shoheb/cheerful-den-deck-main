import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Plus, UserCog, Mail, Phone } from "lucide-react";

type StaffStatus = "On Duty" | "Off Duty";
type StaffShift = "Morning" | "Evening" | "Night";

type StaffMember = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: StaffStatus;
  shift: StaffShift;
};

const initialStaff: StaffMember[] = [
  { id: "1", name: "Maria Garcia", role: "Housekeeping Lead", email: "maria@lodge.com", phone: "+1 555-1001", status: "On Duty", shift: "Morning" },
  { id: "2", name: "John Davis", role: "Housekeeper", email: "john@lodge.com", phone: "+1 555-1002", status: "On Duty", shift: "Morning" },
  { id: "3", name: "Sarah Kim", role: "Housekeeper", email: "sarah@lodge.com", phone: "+1 555-1003", status: "Off Duty", shift: "Evening" },
  { id: "4", name: "Tom Rodriguez", role: "Maintenance", email: "tom@lodge.com", phone: "+1 555-1004", status: "On Duty", shift: "Morning" },
  { id: "5", name: "Lisa Chen", role: "Front Desk", email: "lisa@lodge.com", phone: "+1 555-1005", status: "On Duty", shift: "Morning" },
  { id: "6", name: "David Park", role: "Front Desk", email: "david@lodge.com", phone: "+1 555-1006", status: "Off Duty", shift: "Night" },
];

const statusColors: Record<StaffStatus, string> = {
  "On Duty": "bg-success/10 text-success border-success/20",
  "Off Duty": "bg-muted text-muted-foreground border-border",
};

const Staff = () => {
  const [staff, setStaff] = useAppState<StaffMember[]>("rm_staff", initialStaff);
  const [addOpen, setAddOpen] = useState(false);
  const [newStaff, setNewStaff] = useState<{
    name: string;
    role: string;
    email: string;
    phone: string;
    status: StaffStatus;
    shift: StaffShift;
  }>({
    name: "",
    role: "",
    email: "",
    phone: "",
    status: "On Duty",
    shift: "Morning",
  });

  const canSubmitNewStaff =
    newStaff.name.trim().length > 0 &&
    newStaff.role.trim().length > 0 &&
    newStaff.email.trim().length > 0 &&
    newStaff.phone.trim().length > 0;

  const handleCreateStaff = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmitNewStaff) return;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (crypto as any).randomUUID()
        : String(Date.now());

    const next: StaffMember = {
      id,
      name: newStaff.name.trim(),
      role: newStaff.role.trim(),
      email: newStaff.email.trim(),
      phone: newStaff.phone.trim(),
      status: newStaff.status,
      shift: newStaff.shift,
    };

    setStaff((prev) => [next, ...prev]);
    setAddOpen(false);
    setNewStaff({ name: "", role: "", email: "", phone: "", status: "On Duty", shift: "Morning" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff</h1>
          <p className="text-sm text-muted-foreground">Manage team members and schedules</p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="staff-name">Name</Label>
                  <Input
                    id="staff-name"
                    placeholder="Full name"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-role">Role</Label>
                  <Input
                    id="staff-role"
                    placeholder="e.g. Front Desk"
                    value={newStaff.role}
                    onChange={(e) => setNewStaff((prev) => ({ ...prev, role: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="staff-email">Email</Label>
                  <Input
                    id="staff-email"
                    type="email"
                    placeholder="name@lodge.com"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-phone">Phone</Label>
                  <Input
                    id="staff-phone"
                    placeholder="+1 555-1001"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={newStaff.status}
                    onValueChange={(value) => setNewStaff((prev) => ({ ...prev, status: value as StaffStatus }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="On Duty">On Duty</SelectItem>
                      <SelectItem value="Off Duty">Off Duty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Shift</Label>
                  <Select
                    value={newStaff.shift}
                    onValueChange={(value) => setNewStaff((prev) => ({ ...prev, shift: value as StaffShift }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select shift" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morning">Morning</SelectItem>
                      <SelectItem value="Evening">Evening</SelectItem>
                      <SelectItem value="Night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmitNewStaff}>
                  Add Staff
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((s) => (
          <Card key={s.id} className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {s.name
                      .split(" ")
                      .filter(Boolean)
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.role}</p>
                  </div>
                </div>
                <Badge variant="outline" className={statusColors[s.status]}>
                  {s.status}
                </Badge>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  {s.email}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  {s.phone}
                </div>
                <div className="flex items-center gap-2">
                  <UserCog className="h-3.5 w-3.5" />Shift: {s.shift}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Staff;
