import { ChangeEvent, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/hooks/use-app-state";
import { toast } from "@/components/ui/use-toast";
import { useAuditLog } from "@/hooks/use-audit-log";
import { useSuperAdminNotifications } from "@/hooks/use-superadmin-notifications";

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
  const [importReport, setImportReport] = useState<{ imported: number; rejected: number; reasons: string[] } | null>(null);
  const pageSize = 5;
  const { logAction } = useAuditLog();
  const { pushNotification } = useSuperAdminNotifications();
  const fileInputId = "sa-announcements-csv";

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

  const handleSave = () => {
    const title = form.title.trim();
    const audience = form.audience.trim();
    if (!title || !audience) {
      toast({ title: "Missing details", description: "Title and audience are required." });
      return;
    }

    const today = new Date();
    const date = today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    if (editingId) {
      setAnnouncements((prev) =>
        (prev || []).map((item) =>
          item.id === editingId
            ? { ...item, title, audience, priority: form.priority, approvalStatus: "Pending" }
            : item,
        ),
      );
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

      setAnnouncements((prev) => [newItem, ...(prev || [])]);
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
  };

  const handleDelete = (id: string) => {
    const item = (announcements || []).find((entry) => entry.id === id);
    setAnnouncements((prev) => (prev || []).filter((item) => item.id !== id));
    if (item) {
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
    }
    if (editingId === id) {
      setEditingId(null);
      setForm({ title: "", audience: "", priority: "Medium" });
    }
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

    setAnnouncements((prev) => [...imported, ...(prev || [])]);
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
            <Button onClick={handleSave}>{editingId ? "Update Announcement" : "Publish Announcement"}</Button>
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
                  <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)}>
                    Delete
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
