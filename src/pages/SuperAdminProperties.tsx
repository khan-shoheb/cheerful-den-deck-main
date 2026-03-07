import { ChangeEvent, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/hooks/use-app-state";
import { toast } from "@/components/ui/use-toast";
import { useAuditLog } from "@/hooks/use-audit-log";
import { useSuperAdminNotifications } from "@/hooks/use-superadmin-notifications";

type PropertyRow = {
  id: string;
  name: string;
  city: string;
  admins: number;
  occupancy: string;
  status: "Healthy" | "Watch" | "Needs Review";
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

const defaultProperties: PropertyRow[] = [
  { id: "p1", name: "Delhi Central", city: "Delhi", admins: 4, occupancy: "82%", status: "Healthy" },
  { id: "p2", name: "Jaipur Palace", city: "Jaipur", admins: 3, occupancy: "76%", status: "Healthy" },
  { id: "p3", name: "Goa Bay", city: "Goa", admins: 2, occupancy: "69%", status: "Watch" },
  { id: "p4", name: "Blue Star", city: "Pune", admins: 2, occupancy: "61%", status: "Needs Review" },
];

const badgeTone: Record<string, string> = {
  Healthy: "bg-emerald-100 text-emerald-700",
  Watch: "bg-amber-100 text-amber-700",
  "Needs Review": "bg-red-100 text-red-700",
};

const SuperAdminProperties = () => {
  const [properties, setProperties] = useAppState<PropertyRow[]>("sa_properties", defaultProperties);
  const [, setRecycleBin] = useAppState<RecycleBinItem[]>("sa_recycle_bin", []);
  const [form, setForm] = useState({ name: "", city: "", occupancy: "", status: "Watch" as PropertyRow["status"] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | PropertyRow["status"]>("All");
  const [approvalFilter, setApprovalFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "occupancy-desc">("name-asc");
  const [page, setPage] = useState(1);
  const [importReport, setImportReport] = useState<{ imported: number; rejected: number; reasons: string[] } | null>(null);
  const pageSize = 6;
  const { logAction } = useAuditLog();
  const { pushNotification } = useSuperAdminNotifications();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredProperties = (properties || []).filter((property) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !query || property.name.toLowerCase().includes(query) || property.city.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "All" || property.status === statusFilter;
    const approval = property.approvalStatus || "Approved";
    const matchesApproval = approvalFilter === "All" || approval === approvalFilter;
    return matchesSearch && matchesStatus && matchesApproval;
  });

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (sortBy === "name-asc") return a.name.localeCompare(b.name);
    if (sortBy === "name-desc") return b.name.localeCompare(a.name);
    const getOcc = (v: string) => Number(v.replace("%", "")) || 0;
    return getOcc(b.occupancy) - getOcc(a.occupancy);
  });

  const totalPages = Math.max(1, Math.ceil(sortedProperties.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedProperties = sortedProperties.slice((safePage - 1) * pageSize, safePage * pageSize);
  const healthyCount = (properties || []).filter((p) => p.status === "Healthy").length;
  const watchCount = (properties || []).filter((p) => p.status === "Watch").length;
  const reviewCount = (properties || []).filter((p) => p.status === "Needs Review").length;

  const handleSaveProperty = () => {
    const name = form.name.trim();
    const city = form.city.trim();
    const occupancy = form.occupancy.trim();
    if (!name || !city || !occupancy) {
      toast({ title: "Missing details", description: "Property, city, and occupancy are required." });
      return;
    }

    if (editingId) {
      setProperties((prev) =>
        (prev || []).map((item) =>
          item.id === editingId
            ? { ...item, name, city, occupancy, status: form.status, approvalStatus: "Pending" }
            : item,
        ),
      );
      setEditingId(null);
      logAction({ module: "superadmin-properties", action: "update", details: `Updated property ${name} (pending approval)` });
      pushNotification({
        title: "Property Updated",
        message: `${name} updated and moved to pending approval.`,
        module: "superadmin-properties",
        severity: "warning",
      });
      toast({ title: "Property updated", description: `${name} marked as pending approval.` });
    } else {
      const row: PropertyRow = {
        id: crypto.randomUUID(),
        name,
        city,
        occupancy,
        admins: 1,
        status: form.status,
        approvalStatus: "Pending",
      };
      setProperties((prev) => [row, ...(prev || [])]);
      logAction({ module: "superadmin-properties", action: "create", details: `Created property ${name} (pending approval)` });
      pushNotification({
        title: "New Property Added",
        message: `${name} created and queued for approval.`,
        module: "superadmin-properties",
        severity: "info",
      });
      toast({ title: "Property added", description: `${name} added and queued for approval.` });
    }

    setForm({ name: "", city: "", occupancy: "", status: "Watch" });
  };

  const handleDelete = (id: string) => {
    const item = (properties || []).find((property) => property.id === id);
    setProperties((prev) => (prev || []).filter((item) => item.id !== id));
    if (item) {
      setRecycleBin((prev) => [
        {
          id: crypto.randomUUID(),
          module: "properties",
          itemId: item.id,
          itemName: item.name,
          payload: item,
          deletedAt: new Date().toISOString(),
        },
        ...(prev || []),
      ]);
      logAction({ module: "superadmin-properties", action: "delete", details: `Deleted property ${item.name} to recycle bin` });
      pushNotification({
        title: "Property Deleted",
        message: `${item.name} moved to recycle bin.`,
        module: "superadmin-properties",
        severity: "warning",
      });
    }
    if (editingId === id) {
      setEditingId(null);
      setForm({ name: "", city: "", occupancy: "", status: "Watch" });
    }
  };

  const handleEdit = (row: PropertyRow) => {
    setEditingId(row.id);
    setForm({ name: row.name, city: row.city, occupancy: row.occupancy, status: row.status });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ name: "", city: "", occupancy: "", status: "Watch" });
  };

  const csvEscape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

  const handleExportCsv = () => {
    const header = ["name", "city", "admins", "occupancy", "status", "approvalStatus"];
    const rows = (properties || []).map((item) =>
      [
        csvEscape(item.name),
        csvEscape(item.city),
        csvEscape(item.admins),
        csvEscape(item.occupancy),
        csvEscape(item.status),
        csvEscape(item.approvalStatus || "Approved"),
      ].join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `properties-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = () => {
    const header = "name,city,admins,occupancy,status,approvalStatus";
    const sample = "Sample Property,Delhi,2,75%,Watch,Pending";
    const csv = `${header}\n${sample}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "properties-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length <= 1) return;

    const validStatus = new Set<PropertyRow["status"]>(["Healthy", "Watch", "Needs Review"]);
    const validApproval = new Set(["Pending", "Approved", "Rejected"]);
    const reasons: string[] = [];

    const imported = lines.slice(1).flatMap((line, index) => {
      const parts = line.split(",").map((item) => item.replace(/^"|"$/g, "").replace(/""/g, '"').trim());
      const [name, city, admins, occupancy, status, approvalStatus] = parts;
      const parsedStatus = (status as PropertyRow["status"]) || "Watch";
      const parsedApproval = (approvalStatus as "Pending" | "Approved" | "Rejected") || "Pending";

      if (!name || !city) {
        reasons.push(`Row ${index + 2}: name/city missing`);
        return [];
      }

      if (!validStatus.has(parsedStatus)) {
        reasons.push(`Row ${index + 2}: invalid status '${status}'`);
        return [];
      }

      if (!validApproval.has(parsedApproval)) {
        reasons.push(`Row ${index + 2}: invalid approvalStatus '${approvalStatus}'`);
        return [];
      }

      if (!/^\d{1,3}%$/.test(occupancy || "")) {
        reasons.push(`Row ${index + 2}: occupancy must be like 74%`);
        return [];
      }

      return [{
        id: crypto.randomUUID(),
        name,
        city,
        admins: Number(admins) || 1,
        occupancy,
        status: parsedStatus,
        approvalStatus: parsedApproval,
      } satisfies PropertyRow];
    });

    setProperties((prev) => [...imported, ...(prev || [])]);
    logAction({ module: "superadmin-properties", action: "import", details: `Imported ${imported.length} properties from CSV` });
    pushNotification({
      title: "Property CSV Imported",
      message: `${imported.length} imported, ${reasons.length} rejected.`,
      module: "superadmin-properties",
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
            <p className="text-xs text-slate-500">Total Properties</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{(properties || []).length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Healthy / Watch</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{healthyCount} / {watchCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Needs Review</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{reviewCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{editingId ? "Edit Property" : "Add Property"}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <Input
            placeholder="Property name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
          />
          <Input
            placeholder="Occupancy (e.g. 74%)"
            value={form.occupancy}
            onChange={(e) => setForm((prev) => ({ ...prev, occupancy: e.target.value }))}
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as PropertyRow["status"] }))}
          >
            <option value="Healthy">Healthy</option>
            <option value="Watch">Watch</option>
            <option value="Needs Review">Needs Review</option>
          </select>
          <div className="flex gap-2">
            <Button onClick={handleSaveProperty}>{editingId ? "Update" : "Save"}</Button>
            {editingId && (
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Property Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <Input
              placeholder="Search by property or city"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:col-span-2"
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "All" | PropertyRow["status"])}
            >
              <option value="All">All Status</option>
              <option value="Healthy">Healthy</option>
              <option value="Watch">Watch</option>
              <option value="Needs Review">Needs Review</option>
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
              onChange={(e) => setSortBy(e.target.value as "name-asc" | "name-desc" | "occupancy-desc")}
            >
              <option value="name-asc">Sort: Name A-Z</option>
              <option value="name-desc">Sort: Name Z-A</option>
              <option value="occupancy-desc">Sort: Occupancy High-Low</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              Download Template
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              Import CSV
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCsv} />
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-3 font-medium">Property</th>
                  <th className="pb-3 font-medium">City</th>
                  <th className="pb-3 font-medium">Admins</th>
                  <th className="pb-3 font-medium">Occupancy</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Approval</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedProperties.map((property) => (
                  <tr key={property.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 font-medium text-slate-900">{property.name}</td>
                    <td className="py-3 text-slate-600">{property.city}</td>
                    <td className="py-3 text-slate-600">{property.admins}</td>
                    <td className="py-3 text-slate-600">{property.occupancy}</td>
                    <td className="py-3">
                      <Badge variant="secondary" className={badgeTone[property.status]}>
                        {property.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-slate-600">{property.approvalStatus || "Approved"}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(property)}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(property.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing {(sortedProperties.length === 0 ? 0 : (safePage - 1) * pageSize + 1)}-
              {Math.min(safePage * pageSize, sortedProperties.length)} of {sortedProperties.length}
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

export default SuperAdminProperties;
