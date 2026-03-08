import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/hooks/use-app-state";
import { useAuditLog } from "@/hooks/use-audit-log";
import { useSuperAdminNotifications } from "@/hooks/use-superadmin-notifications";
import { canUseBackend } from "@/lib/hotel-api";
import { supabase } from "@/lib/supabase";

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

type RecycleBinDbRow = {
  id: string;
  module: "properties" | "announcements";
  item_id: string;
  item_name: string;
  payload: unknown;
  deleted_at: string;
};

const SuperAdminRecycleBin = () => {
  const [recycleBin, setRecycleBin] = useAppState<RecycleBinItem[]>("sa_recycle_bin", []);
  const [properties, setProperties] = useAppState<PropertyRow[]>("sa_properties", []);
  const [announcements, setAnnouncements] = useAppState<Announcement[]>("sa_announcements", []);
  const [searchTerm, setSearchTerm] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const { logAction } = useAuditLog();
  const { pushNotification } = useSuperAdminNotifications();

  const fetchRecycleBinFromBackend = async () => {
    if (!canUseBackend() || !supabase) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("sa_recycle_bin")
      .select("id,module,item_id,item_name,payload,deleted_at")
      .eq("user_id", user.id)
      .order("deleted_at", { ascending: false });

    if (error || !data) return;

    setRecycleBin(
      (data as RecycleBinDbRow[]).map((row) => ({
        id: row.id,
        module: row.module,
        itemId: row.item_id,
        itemName: row.item_name,
        payload: row.payload,
        deletedAt: row.deleted_at,
      })),
    );
  };

  useEffect(() => {
    void fetchRecycleBinFromBackend();
  }, []);

  const filteredItems = [...(recycleBin || [])]
    .filter((item) => item.itemName.toLowerCase().includes(searchTerm.trim().toLowerCase()))
    .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

  const handleRestore = async (row: RecycleBinItem) => {
    if (busyId) return;
    setBusyId(row.id);

    const previousRecycle = recycleBin || [];
    const previousProperties = properties || [];
    const previousAnnouncements = announcements || [];

    setRecycleBin((prev) => (prev || []).filter((item) => item.id !== row.id));

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

    if (canUseBackend() && supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRecycleBin(previousRecycle);
        setProperties(previousProperties);
        setAnnouncements(previousAnnouncements);
        setBusyId(null);
        return;
      }

      if (row.module === "properties") {
        const payload = row.payload as PropertyRow;
        const { error } = await supabase.from("sa_properties").upsert(
          {
            id: payload.id,
            user_id: user.id,
            name: payload.name,
            city: payload.city,
            admins_count: payload.admins,
            occupancy: payload.occupancy,
            health_status: payload.status,
            approval_status: payload.approvalStatus || "Approved",
          },
          { onConflict: "id" },
        );
        if (error) {
          setRecycleBin(previousRecycle);
          setProperties(previousProperties);
          setAnnouncements(previousAnnouncements);
          setBusyId(null);
          return;
        }
      }

      if (row.module === "announcements") {
        const payload = row.payload as Announcement;
        const { error } = await supabase.from("sa_announcements").upsert(
          {
            id: payload.id,
            user_id: user.id,
            title: payload.title,
            audience: payload.audience,
            publish_date: payload.date || new Date().toLocaleDateString("en-GB"),
            priority: payload.priority,
            approval_status: payload.approvalStatus || "Approved",
          },
          { onConflict: "id" },
        );
        if (error) {
          setRecycleBin(previousRecycle);
          setProperties(previousProperties);
          setAnnouncements(previousAnnouncements);
          setBusyId(null);
          return;
        }
      }

      const { error: deleteError } = await supabase.from("sa_recycle_bin").delete().eq("user_id", user.id).eq("id", row.id);
      if (deleteError) {
        setRecycleBin(previousRecycle);
        setProperties(previousProperties);
        setAnnouncements(previousAnnouncements);
        setBusyId(null);
        return;
      }

      void fetchRecycleBinFromBackend();
    }

    setRecycleBin((prev) => (prev || []).filter((item) => item.id !== row.id));
    logAction({ module: "superadmin-recycle-bin", action: "restore", details: `Restored ${row.module} ${row.itemName}` });
    pushNotification({
      title: "Item Restored",
      message: `${row.itemName} restored from recycle bin.`,
      module: "superadmin-recycle-bin",
      severity: "success",
    });
    setBusyId(null);
  };

  const handlePermanentDelete = async (id: string) => {
    if (busyId) return;

    const row = (recycleBin || []).find((item) => item.id === id);
    const previousRecycle = recycleBin || [];
    setBusyId(id);
    setRecycleBin((prev) => (prev || []).filter((item) => item.id !== id));

    if (canUseBackend() && supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from("sa_recycle_bin").delete().eq("user_id", user.id).eq("id", id);
        if (error) {
          setRecycleBin(previousRecycle);
          setBusyId(null);
          return;
        }
      }
    }

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
    setBusyId(null);
  };

  const handleClearAll = async () => {
    if (isClearing) return;

    const previousRecycle = recycleBin || [];
    setIsClearing(true);
    setRecycleBin([]);

    if (canUseBackend() && supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from("sa_recycle_bin").delete().eq("user_id", user.id);
        if (error) {
          setRecycleBin(previousRecycle);
          setIsClearing(false);
          return;
        }
      }
    }

    logAction({ module: "superadmin-recycle-bin", action: "clear-all", details: "Cleared all recycle bin items" });
    pushNotification({
      title: "Recycle Bin Cleared",
      message: "All items were removed from recycle bin.",
      module: "superadmin-recycle-bin",
      severity: "warning",
    });
    setIsClearing(false);
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
            <Button variant="outline" onClick={handleClearAll} disabled={(recycleBin || []).length === 0 || isClearing}>
              {isClearing ? "Clearing..." : "Clear All"}
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
                  <Button size="sm" disabled={busyId === item.id} onClick={() => handleRestore(item)}>
                    {busyId === item.id ? "Working..." : "Restore"}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyId === item.id} onClick={() => handlePermanentDelete(item.id)}>
                    {busyId === item.id ? "Working..." : "Delete Permanently"}
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
