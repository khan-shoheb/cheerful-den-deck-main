import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSuperAdminNotifications } from "@/hooks/use-superadmin-notifications";

const toneMap: Record<string, string> = {
  info: "bg-blue-100 text-blue-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
};

const SuperAdminNotifications = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } =
    useSuperAdminNotifications();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "unread" | "read">("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notifications.filter((item) => {
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.message.toLowerCase().includes(query) ||
        item.module.toLowerCase().includes(query);
      const matchesStatus = status === "all" || (status === "unread" ? !item.read : item.read);
      return matchesSearch && matchesStatus;
    });
  }, [notifications, search, status]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notifications Center</h1>
        <p className="text-sm text-slate-600">Track important platform events and approvals.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Notifications</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{notifications.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Unread</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{unreadCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Read</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{notifications.length - unreadCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Notification Feed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input
              placeholder="Search title, message, module"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="md:col-span-2"
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as "all" | "unread" | "read")}
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                Mark All Read
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear
              </Button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              No notifications found.
            </div>
          ) : (
            filtered.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <Badge variant="secondary" className={toneMap[item.severity]}>
                    {item.severity}
                  </Badge>
                  {!item.read && <Badge variant="secondary" className="bg-cyan-100 text-cyan-700">new</Badge>}
                  <p className="ml-auto text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">{item.message}</p>
                <p className="text-xs text-slate-500">Module: {item.module}</p>
                <div className="mt-3 flex gap-2">
                  {!item.read && (
                    <Button size="sm" variant="outline" onClick={() => markAsRead(item.id)}>
                      Mark Read
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => deleteNotification(item.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminNotifications;
