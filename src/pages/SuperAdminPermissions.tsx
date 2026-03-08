import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAppState } from "@/hooks/use-app-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useAuditLog } from "@/hooks/use-audit-log";
import { canUseBackend } from "@/lib/hotel-api";
import { supabase } from "@/lib/supabase";

type PermissionPolicy = {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
};

type PermissionPolicyDbRow = {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
};

const defaultPolicies: PermissionPolicy[] = [
  {
    id: "billing-write",
    title: "Allow Admin Billing Edits",
    description: "Permit property admins to edit invoices and payment status.",
    enabled: true,
  },
  {
    id: "staff-delete",
    title: "Allow Staff Delete",
    description: "Allow manager roles to delete staff profiles from roster.",
    enabled: false,
  },
  {
    id: "booking-export",
    title: "Allow Booking Export",
    description: "Enable CSV export for all confirmed and cancelled bookings.",
    enabled: true,
  },
  {
    id: "night-audit-lock",
    title: "Enforce Night Audit Lock",
    description: "Freeze booking modifications after midnight until audit completion.",
    enabled: true,
  },
];

const SuperAdminPermissions = () => {
  const [policies, setPolicies] = useAppState<PermissionPolicy[]>("sa_permissions", defaultPolicies);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "" });
  const { logAction } = useAuditLog();

  const fetchPoliciesFromBackend = async () => {
    if (!canUseBackend() || !supabase) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("sa_permission_policies")
      .select("id,title,description,enabled")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error || !data) return;
    setPolicies((data as PermissionPolicyDbRow[]).map((row) => ({ ...row })));
  };

  useEffect(() => {
    void fetchPoliciesFromBackend();
  }, []);

  const filteredPolicies = (policies || []).filter((policy) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !query || policy.title.toLowerCase().includes(query) || policy.description.toLowerCase().includes(query);
    const matchesStatus =
      statusFilter === "all" || (statusFilter === "enabled" ? policy.enabled : !policy.enabled);
    return matchesSearch && matchesStatus;
  });

  const handleToggle = async (id: string, enabled: boolean) => {
    const previousPolicies = policies || [];
    const policy = (policies || []).find((item) => item.id === id);
    setPolicies((prev) => (prev || []).map((item) => (item.id === id ? { ...item, enabled } : item)));

    if (canUseBackend() && supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPolicies(previousPolicies);
        toast({ title: "Session required", description: "Please login again.", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from("sa_permission_policies")
        .update({ enabled })
        .eq("user_id", user.id)
        .eq("id", id);

      if (error) {
        setPolicies(previousPolicies);
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
        return;
      }
    }

    if (policy) {
      logAction({
        module: "superadmin-permissions",
        action: enabled ? "enable" : "disable",
        details: `${enabled ? "Enabled" : "Disabled"} policy ${policy.title}`,
      });
    }
  };

  const handleEdit = (policy: PermissionPolicy) => {
    setEditingId(policy.id);
    setForm({ title: policy.title, description: policy.description });
  };

  const handleUpdate = async () => {
    const title = form.title.trim();
    const description = form.description.trim();
    if (!editingId || !title || !description) {
      toast({ title: "Missing details", description: "Title and description are required." });
      return;
    }

    const previousPolicies = policies || [];
    setPolicies((prev) =>
      (prev || []).map((policy) =>
        policy.id === editingId
          ? {
              ...policy,
              title,
              description,
            }
          : policy,
      ),
    );

    if (canUseBackend() && supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPolicies(previousPolicies);
        toast({ title: "Session required", description: "Please login again.", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from("sa_permission_policies")
        .update({ title, description })
        .eq("user_id", user.id)
        .eq("id", editingId);

      if (error) {
        setPolicies(previousPolicies);
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
        return;
      }
    }

    setEditingId(null);
    setForm({ title: "", description: "" });
    logAction({ module: "superadmin-permissions", action: "update", details: `Updated policy ${title}` });
    toast({ title: "Permission updated", description: "Policy details saved." });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ title: "", description: "" });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Policies</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{(policies || []).length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Enabled</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{(policies || []).filter((p) => p.enabled).length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Disabled</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{(policies || []).filter((p) => !p.enabled).length}</p>
          </CardContent>
        </Card>
      </div>

      {editingId && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Edit Permission Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
            <Input
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button onClick={handleUpdate}>Update</Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              placeholder="Search permissions"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:col-span-2"
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "enabled" | "disabled")}
            >
              <option value="all">All</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          {filteredPolicies.map((policy) => (
            <div key={policy.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
              <div>
                <p className="font-medium text-slate-900">{policy.title}</p>
                <p className="text-sm text-slate-600">{policy.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(policy)}>
                  Edit
                </Button>
                <Switch checked={policy.enabled} onCheckedChange={(checked) => handleToggle(policy.id, checked)} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminPermissions;
