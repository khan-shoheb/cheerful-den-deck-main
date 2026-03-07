import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/hooks/use-app-state";
import { useAuditLog } from "@/hooks/use-audit-log";
import { useSuperAdminNotifications } from "@/hooks/use-superadmin-notifications";

type ApprovalStatus = "Pending" | "Approved" | "Rejected";

type PropertyRow = {
  id: string;
  name: string;
  city: string;
  admins: number;
  occupancy: string;
  status: "Healthy" | "Watch" | "Needs Review";
  approvalStatus?: ApprovalStatus;
};

type Announcement = {
  id: string;
  title: string;
  audience: string;
  date: string;
  priority: "High" | "Medium" | "Low";
  approvalStatus?: ApprovalStatus;
};

const SuperAdminApprovals = () => {
  const [properties, setProperties] = useAppState<PropertyRow[]>("sa_properties", []);
  const [announcements, setAnnouncements] = useAppState<Announcement[]>("sa_announcements", []);
  const { logAction } = useAuditLog();
  const { pushNotification } = useSuperAdminNotifications();

  const pendingProperties = (properties || []).filter((item) => (item.approvalStatus || "Approved") === "Pending");
  const pendingAnnouncements = (announcements || []).filter(
    (item) => (item.approvalStatus || "Approved") === "Pending",
  );

  const updatePropertyApproval = (id: string, status: ApprovalStatus) => {
    const target = (properties || []).find((property) => property.id === id);
    if (!target) return;
    setProperties((prev) =>
      (prev || []).map((property) => (property.id === id ? { ...property, approvalStatus: status } : property)),
    );
    logAction({
      module: "superadmin-approvals",
      action: status.toLowerCase(),
      details: `${status} property ${target.name}`,
    });
    pushNotification({
      title: `Property ${status}`,
      message: `${target.name} was ${status.toLowerCase()} by superadmin.`,
      module: "superadmin-approvals",
      severity: status === "Approved" ? "success" : "warning",
    });
  };

  const updateAnnouncementApproval = (id: string, status: ApprovalStatus) => {
    const target = (announcements || []).find((entry) => entry.id === id);
    if (!target) return;
    setAnnouncements((prev) =>
      (prev || []).map((entry) => (entry.id === id ? { ...entry, approvalStatus: status } : entry)),
    );
    logAction({
      module: "superadmin-approvals",
      action: status.toLowerCase(),
      details: `${status} announcement ${target.title}`,
    });
    pushNotification({
      title: `Announcement ${status}`,
      message: `${target.title} was ${status.toLowerCase()} by superadmin.`,
      module: "superadmin-approvals",
      severity: status === "Approved" ? "success" : "warning",
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Approvals</h1>
        <p className="text-sm text-slate-600">Review pending changes before they are considered finalized.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Pending Properties</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{pendingProperties.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Pending Announcements</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{pendingAnnouncements.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Pending</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{pendingProperties.length + pendingAnnouncements.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Property Approval Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingProperties.length === 0 ? (
            <p className="text-sm text-slate-500">No pending property changes.</p>
          ) : (
            pendingProperties.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.city}</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">Occupancy: {item.occupancy} | Status: {item.status}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => updatePropertyApproval(item.id, "Approved")}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updatePropertyApproval(item.id, "Rejected")}>
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Announcement Approval Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingAnnouncements.length === 0 ? (
            <p className="text-sm text-slate-500">No pending announcements.</p>
          ) : (
            pendingAnnouncements.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.priority}</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">Audience: {item.audience}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => updateAnnouncementApproval(item.id, "Approved")}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateAnnouncementApproval(item.id, "Rejected")}>
                    Reject
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

export default SuperAdminApprovals;
