import { ChangeEvent, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/hooks/use-app-state";
import { toast } from "@/components/ui/use-toast";
import { useAuditLog } from "@/hooks/use-audit-log";
import { useSuperAdminNotifications } from "@/hooks/use-superadmin-notifications";
import { canUseBackend } from "@/lib/hotel-api";
import { supabase } from "@/lib/supabase";

type Announcement = {
  id: string;
  title: string;
  audience: string;
  date: string;
  priority: "High" | "Medium" | "Low";
  approvalStatus?: "Pending" | "Approved" | "Rejected";
};

type RecycleBinItem = {
  id: string;
  module: "properties" | "announcements";
  itemId: string;
  itemName: string;
  payload: unknown;
  deletedAt: string;
};

type SaAnnouncementDbRow = {
  id: string;
  title: string;
  audience: string;
  publish_date: string;
  priority: Announcement["priority"];
  approval_status: "Pending" | "Approved" | "Rejected";
};

const defaultAnnouncements: Announcement[] = [
  {
    id: "a1",
    title: "Scheduled maintenance window",
    audience: "All Properties",
    date: "08 Mar 2026",
    priority: "High",
  },
  {
    id: "a2",
    title: "New GST billing format enabled",
    audience: "Finance + Admin",
    date: "10 Mar 2026",
    priority: "Medium",
  },
  {
    id: "a3",
    title: "Housekeeping app update v2.4",
    audience: "Housekeeping",
    date: "12 Mar 2026",
    priority: "Low",
  },
];

const toneMap: Record<string, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
};

const SuperAdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useAppState<Announcement[]>("sa_announcements", defaultAnnouncements);
  const [, setRecycleBin] = useAppState<RecycleBinItem[]>("sa_recycle_bin", []);
  const [form, setForm] = useState({ title: "", audience: "", priority: "Medium" as Announcement["priority"] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"All" | Announcement["priority"]>("All");
  const [approvalFilter, setApprovalFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importReport, setImportReport] = useState<{ imported: number; rejected: number; reasons: string[] } | null>(null);
  const pageSize = 5;
  const { logAction } = useAuditLog();
  const { pushNotification } = useSuperAdminNotifications();
  const fileInputId = "sa-announcements-csv";

  const mapDbAnnouncementToUi = (row: SaAnnouncementDbRow): Announcement => ({
    id: row.id,
    title: row.title,
    audience: row.audience,
    date: row.publish_date,
    priority: row.priority,
    approvalStatus: row.approval_status,
  });

  const fetchAnnouncementsFromBackend = async () => {
    if (!canUseBackend() || !supabase) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("sa_announcements")
      .select("id,title,audience,publish_date,priority,approval_status")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error || !data) return;
    setAnnouncements((data as SaAnnouncementDbRow[]).map(mapDbAnnouncementToUi));
  };

  useEffect(() => {
    void fetchAnnouncementsFromBackend();
  }, []);

  const filteredAnnouncements = (announcements || []).filter((item) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !query || item.title.toLowerCase().includes(query) || item.audience.toLowerCase().includes(query);
    const matchesPriority = priorityFilter === "All" || item.priority === priorityFilter;
    const approval = item.approvalStatus || "Approved";
    const matchesApproval = approvalFilter === "All" || approval === approvalFilter;
    return matchesSearch && matchesPriority && matchesApproval;
  });

  const parseDate = (value: string) => {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
    return Date.parse(value.replace(/\s/g, " ")) || 0;
  };

  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    const delta = parseDate(b.date) - parseDate(a.date);
    return sortBy === "newest" ? delta : -delta;
  });

  const totalPages = Math.max(1, Math.ceil(sortedAnnouncements.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedAnnouncements = sortedAnnouncements.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSave = async () => {
    if (isSaving) return;

    const title = form.title.trim();
    const audience = form.audience.trim();
    if (!title || !audience) {
      toast({ title: "Missing details", description: "Title and audience are required." });
      return;
    }

    setIsSaving(true);

    const today = new Date();
    const date = today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    try {
      if (editingId) {
        const prevAnnouncements = announcements || [];

        // Apply local update first so the UI feels instant.
        setAnnouncements((prev) =>
          (prev || []).map((item) =>
            item.id === editingId
              ? { ...item, title, audience, priority: form.priority, approvalStatus: "Pending" }
              : item,
          ),
        );

      if (canUseBackend() && supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setAnnouncements(prevAnnouncements);
          toast({ title: "Session required", description: "Please login again and retry.", variant: "destructive" });
          return;
        }

        const { error } = await supabase
          .from("sa_announcements")
          .update({
            title,
            audience,
            priority: form.priority,
            approval_status: "Pending",
          })
          .eq("user_id", user.id)
          .eq("id", editingId);

        if (error) {
          setAnnouncements(prevAnnouncements);
          toast({ title: "Update failed", description: error.message, variant: "destructive" });
          return;
        }

        void fetchAnnouncementsFromBackend();
      }

      logAction({ module: "superadmin-announcements", action: "update", details: `Updated announcement ${title} (pending approval)` });
      pushNotification({
        title: "Announcement Updated",
        message: `${title} updated and queued for approval.`,
        module: "superadmin-announcements",
        severity: "warning",
      });
      toast({ title: "Announcement updated", description: "Announcement queued for approval." });
      setEditingId(null);
      } else {
        const newItem: Announcement = {
          id: crypto.randomUUID(),
          title,
          audience,
          date,
          priority: form.priority,
          approvalStatus: "Pending",
        };

        if (canUseBackend() && supabase) {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            toast({ title: "Session required", description: "Please login again and retry.", variant: "destructive" });
            return;
          }

          const { data, error } = await supabase
            .from("sa_announcements")
            .insert({
              user_id: user.id,
              title,
              audience,
              publish_date: date,
              priority: form.priority,
              approval_status: "Pending",
            })
            .select("id,title,audience,publish_date,priority,approval_status")
            .single();

          if (error || !data) {
            toast({ title: "Create failed", description: error?.message || "Unable to create announcement.", variant: "destructive" });
            return;
          }

          setAnnouncements((prev) => [mapDbAnnouncementToUi(data as SaAnnouncementDbRow), ...(prev || [])]);
        } else {
          setAnnouncements((prev) => [newItem, ...(prev || [])]);
        }

        logAction({ module: "superadmin-announcements", action: "create", details: `Created announcement ${title} (pending approval)` });
        pushNotification({
          title: "Announcement Created",
          message: `${title} created and queued for approval.`,
          module: "superadmin-announcements",
          severity: "info",
        });
        toast({ title: "Announcement added", description: "Announcement queued for approval." });
      }

      setForm({ title: "", audience: "", priority: "Medium" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;

    const item = (announcements || []).find((entry) => entry.id === id);
    if (!item) return;

    const previousAnnouncements = announcements || [];
    setDeletingId(id);
    // Remove immediately, then sync with backend.
    setAnnouncements((prev) => (prev || []).filter((entry) => entry.id !== id));

    if (canUseBackend() && supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAnnouncements(previousAnnouncements);
        setDeletingId(null);
        toast({ title: "Session required", description: "Please login again and retry.", variant: "destructive" });
        return;
      }

      const { error: recycleError } = await supabase.from("sa_recycle_bin").insert({
        user_id: user.id,
        module: "announcements",
        item_id: item.id,
        item_name: item.title,
        payload: item,
      });

      if (recycleError) {
        setAnnouncements(previousAnnouncements);
        setDeletingId(null);
        toast({ title: "Delete failed", description: recycleError.message, variant: "destructive" });
        return;
      }

      const { error: deleteError } = await supabase
        .from("sa_announcements")
        .delete()
        .eq("user_id", user.id)
        .eq("id", item.id);

      if (deleteError) {
        setAnnouncements(previousAnnouncements);
        setDeletingId(null);
        toast({ title: "Delete failed", description: deleteError.message, variant: "destructive" });
        return;
      }

      void fetchAnnouncementsFromBackend();
    }

    setRecycleBin((prev) => [
      {
        id: crypto.randomUUID(),
        module: "announcements",
        itemId: item.id,
        itemName: item.title,
        payload: item,
        deletedAt: new Date().toISOString(),
      },
      ...(prev || []),
    ]);
    logAction({ module: "superadmin-announcements", action: "delete", details: `Deleted announcement ${item.title} to recycle bin` });
    pushNotification({
      title: "Announcement Deleted",
      message: `${item.title} moved to recycle bin.`,
      module: "superadmin-announcements",
      severity: "warning",
    });
    if (editingId === id) {
      setEditingId(null);
      setForm({ title: "", audience: "", priority: "Medium" });
    }
    setDeletingId(null);
  };

  const handleEdit = (item: Announcement) => {
    setEditingId(item.id);
    setForm({ title: item.title, audience: item.audience, priority: item.priority });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ title: "", audience: "", priority: "Medium" });
  };

  const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const handleExportCsv = () => {
    const header = ["title", "audience", "date", "priority", "approvalStatus"];
    const rows = (announcements || []).map((item) =>
      [
        csvEscape(item.title),
        csvEscape(item.audience),
        csvEscape(item.date),
        csvEscape(item.priority),
        csvEscape(item.approvalStatus || "Approved"),
      ].join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `announcements-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = () => {
    const header = "title,audience,date,priority,approvalStatus";
    const sample = "System Maintenance,All Properties,08 Mar 2026,High,Pending";
    const csv = `${header}\n${sample}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "announcements-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length <= 1) return;

    const validPriority = new Set<Announcement["priority"]>(["High", "Medium", "Low"]);
    const validApproval = new Set(["Pending", "Approved", "Rejected"]);
    const reasons: string[] = [];

    const imported = lines.slice(1).flatMap((line, index) => {
      const parts = line.split(",").map((item) => item.replace(/^"|"$/g, "").replace(/""/g, '"').trim());
      const [title, audience, date, priority, approvalStatus] = parts;
      const parsedPriority = (priority as Announcement["priority"]) || "Medium";
      const parsedApproval = (approvalStatus as "Pending" | "Approved" | "Rejected") || "Pending";

      if (!title || !audience) {
        reasons.push(`Row ${index + 2}: title/audience missing`);
        return [];
      }

      if (!validPriority.has(parsedPriority)) {
        reasons.push(`Row ${index + 2}: invalid priority '${priority}'`);
        return [];
      }

      if (!validApproval.has(parsedApproval)) {
        reasons.push(`Row ${index + 2}: invalid approvalStatus '${approvalStatus}'`);
        return [];
      }

      return [{
        id: crypto.randomUUID(),
        title,
        audience,
        date: date || new Date().toLocaleDateString("en-GB"),
        priority: parsedPriority,
        approvalStatus: parsedApproval,
      } satisfies Announcement];
    });

    if (canUseBackend() && supabase && imported.length > 0) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({ title: "Session required", description: "Please login again before import.", variant: "destructive" });
        return;
      }

      const payload = imported.map((item) => ({
        user_id: user.id,
        title: item.title,
        audience: item.audience,
        publish_date: item.date,
        priority: item.priority,
        approval_status: item.approvalStatus || "Pending",
      }));

      const { data, error } = await supabase
        .from("sa_announcements")
        .insert(payload)
        .select("id,title,audience,publish_date,priority,approval_status");
      if (error || !data) {
        toast({ title: "Import failed", description: error.message, variant: "destructive" });
        return;
      }

      const mapped = (data as SaAnnouncementDbRow[]).map(mapDbAnnouncementToUi);
      setAnnouncements((prev) => [...mapped, ...(prev || [])]);
    } else {
      setAnnouncements((prev) => [...imported, ...(prev || [])]);
    }

    logAction({ module: "superadmin-announcements", action: "import", details: `Imported ${imported.length} announcements from CSV` });
    pushNotification({
      title: "Announcement CSV Imported",
      message: `${imported.length} imported, ${reasons.length} rejected.`,
      module: "superadmin-announcements",
      severity: reasons.length > 0 ? "warning" : "success",
    });
    setImportReport({ imported: imported.length, rejected: reasons.length, reasons });
    toast({ title: "Import complete", description: `${imported.length} imported, ${reasons.length} rejected.` });
    event.target.value = "";
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Announcements</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{(announcements || []).length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">High Priority</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {(announcements || []).filter((item) => item.priority === "High").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Medium / Low</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {(announcements || []).filter((item) => item.priority !== "High").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{editingId ? "Edit Announcement" : "Create Announcement"}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input
            placeholder="Announcement title"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="md:col-span-2"
          />
          <Input
            placeholder="Audience"
            value={form.audience}
            onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value }))}
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={form.priority}
            onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value as Announcement["priority"] }))}
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <div className="md:col-span-4 flex gap-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : editingId ? "Update Announcement" : "Publish Announcement"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Global Announcements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input
              placeholder="Search by title or audience"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:col-span-2"
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as "All" | Announcement["priority"])}
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value as "All" | "Pending" | "Approved" | "Rejected")}
            >
              <option value="All">All Approvals</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              Download Template
            </Button>
            <label htmlFor={fileInputId}>
              <Button asChild variant="outline" size="sm">
                <span>Import CSV</span>
              </Button>
            </label>
            <input id={fileInputId} type="file" accept=".csv" className="hidden" onChange={handleImportCsv} />
          </div>
          {importReport && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              Imported: {importReport.imported} | Rejected: {importReport.rejected}
              {importReport.reasons.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
                  {importReport.reasons.slice(0, 5).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {pagedAnnouncements.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-900">{item.title}</p>
                <Badge variant="secondary" className={toneMap[item.priority]}>
                  {item.priority}
                </Badge>
                <div className="ml-auto flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" disabled={deletingId === item.id} onClick={() => handleDelete(item.id)}>
                    {deletingId === item.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600">Audience: {item.audience}</p>
              <p className="text-sm text-slate-500">Date: {item.date}</p>
              <p className="text-sm text-slate-500">Approval: {item.approvalStatus || "Approved"}</p>
            </div>
          ))}

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing {(sortedAnnouncements.length === 0 ? 0 : (safePage - 1) * pageSize + 1)}-
              {Math.min(safePage * pageSize, sortedAnnouncements.length)} of {sortedAnnouncements.length}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminAnnouncements;
