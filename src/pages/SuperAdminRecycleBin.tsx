import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/hooks/use-app-state";
import { useAuditLog } from "@/hooks/use-audit-log";
import { useSuperAdminNotifications } from "@/hooks/use-superadmin-notifications";

type RecycleBinItem = {
  id: string;
  module: "properties" | "announcements";
  itemId: string;
  itemName: string;
  payload: unknown;
  deletedAt: string;
};

type PropertyRow = {
  id: string;
  name: string;
  city: string;
  admins: number;
  occupancy: string;
  status: "Healthy" | "Watch" | "Needs Review";
  approvalStatus?: "Pending" | "Approved" | "Rejected";
};

type Announcement = {
  id: string;
  title: string;
  audience: string;
  date: string;
  priority: "High" | "Medium" | "Low";
  approvalStatus?: "Pending" | "Approved" | "Rejected";
};

const SuperAdminRecycleBin = () => {
  const [recycleBin, setRecycleBin] = useAppState<RecycleBinItem[]>("sa_recycle_bin", []);
  const [properties, setProperties] = useAppState<PropertyRow[]>("sa_properties", []);
  const [announcements, setAnnouncements] = useAppState<Announcement[]>("sa_announcements", []);
  const [searchTerm, setSearchTerm] = useState("");
  const { logAction } = useAuditLog();
  const { pushNotification } = useSuperAdminNotifications();

  const filteredItems = [...(recycleBin || [])]
    .filter((item) => item.itemName.toLowerCase().includes(searchTerm.trim().toLowerCase()))
    .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

  const handleRestore = (row: RecycleBinItem) => {
    if (row.module === "properties") {
      const payload = row.payload as PropertyRow;
      setProperties((prev) => {
        const list = prev || [];
        if (list.some((entry) => entry.id === payload.id)) return list;
        return [payload, ...list];
      });
    }

    if (row.module === "announcements") {
      const payload = row.payload as Announcement;
      setAnnouncements((prev) => {
        const list = prev || [];
        if (list.some((entry) => entry.id === payload.id)) return list;
        return [payload, ...list];
      });
    }

    setRecycleBin((prev) => (prev || []).filter((item) => item.id !== row.id));
    logAction({ module: "superadmin-recycle-bin", action: "restore", details: `Restored ${row.module} ${row.itemName}` });
    pushNotification({
      title: "Item Restored",
      message: `${row.itemName} restored from recycle bin.`,
      module: "superadmin-recycle-bin",
      severity: "success",
    });
  };

  const handlePermanentDelete = (id: string) => {
    const row = (recycleBin || []).find((item) => item.id === id);
    setRecycleBin((prev) => (prev || []).filter((item) => item.id !== id));
    if (row) {
      logAction({
        module: "superadmin-recycle-bin",
        action: "permanent-delete",
        details: `Permanently deleted ${row.module} ${row.itemName}`,
      });
      pushNotification({
        title: "Item Permanently Deleted",
        message: `${row.itemName} permanently removed.`,
        module: "superadmin-recycle-bin",
        severity: "error",
      });
    }
  };

  const handleClearAll = () => {
    setRecycleBin([]);
    logAction({ module: "superadmin-recycle-bin", action: "clear-all", details: "Cleared all recycle bin items" });
    pushNotification({
      title: "Recycle Bin Cleared",
      message: "All items were removed from recycle bin.",
      module: "superadmin-recycle-bin",
      severity: "warning",
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Recycle Bin</h1>
        <p className="text-sm text-slate-600">Restore accidentally deleted records or permanently remove them.</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Deleted Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input
              placeholder="Search deleted items"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:col-span-3"
            />
            <Button variant="outline" onClick={handleClearAll} disabled={(recycleBin || []).length === 0}>
              Clear All
            </Button>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              Recycle bin is empty.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.itemName}</p>
                  <p className="text-xs text-slate-500">{item.module} | {new Date(item.deletedAt).toLocaleString()}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => handleRestore(item)}>
                    Restore
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handlePermanentDelete(item.id)}>
                    Delete Permanently
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

export default SuperAdminRecycleBin;
