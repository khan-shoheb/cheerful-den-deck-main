import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/hooks/use-app-state";
import { canUseBackend } from "@/lib/hotel-api";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

type AdminStatus = "Active" | "Pending" | "Suspended";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  property: string;
  status: AdminStatus;
};

type AdminUserDbRow = {
  id: string;
  name: string;
  email: string;
  property_name: string;
  status: AdminStatus;
};

const defaultAdmins: AdminUser[] = [
  { id: "u1", name: "Ravi Sharma", email: "ravi@hotelcentral.com", property: "Delhi Central", status: "Active" },
  { id: "u2", name: "Meera Kapoor", email: "meera@jaipurpalace.com", property: "Jaipur Palace", status: "Active" },
  { id: "u3", name: "Arjun Nair", email: "arjun@goabay.com", property: "Goa Bay", status: "Pending" },
];

const toneMap: Record<AdminStatus, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Suspended: "bg-red-100 text-red-700",
};

const SuperAdminUsers = () => {
  const [admins, setAdmins] = useAppState<AdminUser[]>("sa_admin_users", defaultAdmins);
  const [form, setForm] = useState({ name: "", email: "", property: "", status: "Pending" as AdminStatus });
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [busyAdminId, setBusyAdminId] = useState<string | null>(null);

  const fetchAdmins = async () => {
    if (!canUseBackend() || !supabase) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("sa_admin_users")
      .select("id,name,email,property_name,status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !data) return;

    setAdmins(
      (data as AdminUserDbRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        property: row.property_name,
        status: row.status,
      })),
    );
  };

  useEffect(() => {
    void fetchAdmins();
  }, []);

  const filteredAdmins = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.property.toLowerCase().includes(q),
    );
  }, [admins, search]);

  const handleCreate = async () => {
    if (isCreating) return;

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const property = form.property.trim();
    if (!name || !email || !property) {
      toast({ title: "Missing details", description: "Name, email and property are required." });
      return;
    }

    setIsCreating(true);

    if (canUseBackend() && supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsCreating(false);
        toast({ title: "Session required", description: "Please login again.", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase
        .from("sa_admin_users")
        .insert({
          user_id: user.id,
          name,
          email,
          property_name: property,
          status: form.status,
        })
        .select("id,name,email,property_name,status")
        .single();

      if (error || !data) {
        setIsCreating(false);
        toast({ title: "Create failed", description: error?.message || "Unable to create user.", variant: "destructive" });
        return;
      }

      const row = data as AdminUserDbRow;
      setAdmins((prev) => [
        { id: row.id, name: row.name, email: row.email, property: row.property_name, status: row.status },
        ...(prev || []),
      ]);
    } else {
      setAdmins((prev) => [{ id: crypto.randomUUID(), name, email, property, status: form.status }, ...(prev || [])]);
    }

    setForm({ name: "", email: "", property: "", status: "Pending" });
    setIsCreating(false);
  };

  const handleStatusChange = async (admin: AdminUser, status: AdminStatus) => {
    if (busyAdminId) return;

    const prevAdmins = admins || [];
    setBusyAdminId(admin.id);
    setAdmins((prev) => (prev || []).map((item) => (item.id === admin.id ? { ...item, status } : item)));

    if (canUseBackend() && supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAdmins(prevAdmins);
        setBusyAdminId(null);
        return;
      }

      const { error } = await supabase.from("sa_admin_users").update({ status }).eq("user_id", user.id).eq("id", admin.id);
      if (error) {
        setAdmins(prevAdmins);
        setBusyAdminId(null);
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
        return;
      }
    }
    setBusyAdminId(null);
  };

  const handleDelete = async (admin: AdminUser) => {
    if (busyAdminId) return;
    if (!window.confirm(`Delete ${admin.name}?`)) return;

    const prevAdmins = admins || [];
    setBusyAdminId(admin.id);
    setAdmins((prev) => (prev || []).filter((item) => item.id !== admin.id));

    if (canUseBackend() && supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAdmins(prevAdmins);
        setBusyAdminId(null);
        return;
      }

      const { error } = await supabase.from("sa_admin_users").delete().eq("user_id", user.id).eq("id", admin.id);
      if (error) {
        setAdmins(prevAdmins);
        setBusyAdminId(null);
        toast({ title: "Delete failed", description: error.message, variant: "destructive" });
        return;
      }
    }
    setBusyAdminId(null);
  };

  return (
    <div className="space-y-5">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Add Admin User</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <Input
            placeholder="Property"
            value={form.property}
            onChange={(e) => setForm((p) => ({ ...p, property: e.target.value }))}
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as AdminStatus }))}
          >
            <option value="Pending">Pending</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
          </select>
          <Button onClick={handleCreate} disabled={isCreating}>{isCreating ? "Adding..." : "Add"}</Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Admin User Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Search users" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Property</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 font-medium text-slate-900">{admin.name}</td>
                    <td className="py-3 text-slate-600">{admin.email}</td>
                    <td className="py-3 text-slate-600">{admin.property}</td>
                    <td className="py-3">
                      <Badge variant="secondary" className={toneMap[admin.status]}>
                        {admin.status}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={busyAdminId === admin.id} onClick={() => handleStatusChange(admin, "Active")}>
                          Activate
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyAdminId === admin.id} onClick={() => handleStatusChange(admin, "Suspended")}>
                          Suspend
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyAdminId === admin.id} onClick={() => handleDelete(admin)}>
                          {busyAdminId === admin.id ? "Working..." : "Delete"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminUsers;
