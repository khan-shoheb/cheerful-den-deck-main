import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { useAppState } from "@/hooks/use-app-state";
import { useAuditLog } from "@/hooks/use-audit-log";
import { useSuperAdminNotifications } from "@/hooks/use-superadmin-notifications";
import { canUseBackend } from "@/lib/hotel-api";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

type RoleKey = "admin" | "manager" | "frontdesk" | "housekeeping" | "accountant";
type ModulePermission = {
  module: string;
  permissions: Record<RoleKey, boolean>;
};

type RoleMatrixDbRow = {
  id: string;
  module: string;
  permissions: Record<RoleKey, boolean>;
};

const defaultMatrix: ModulePermission[] = [
  {
    module: "Rooms",
    permissions: { admin: true, manager: true, frontdesk: true, housekeeping: true, accountant: false },
  },
  {
    module: "Bookings",
    permissions: { admin: true, manager: true, frontdesk: true, housekeeping: false, accountant: false },
  },
  {
    module: "Billing",
    permissions: { admin: true, manager: true, frontdesk: false, housekeeping: false, accountant: true },
  },
  {
    module: "Reports",
    permissions: { admin: true, manager: true, frontdesk: false, housekeeping: false, accountant: true },
  },
  {
    module: "Staff",
    permissions: { admin: true, manager: true, frontdesk: false, housekeeping: false, accountant: false },
  },
];

const roles: RoleKey[] = ["admin", "manager", "frontdesk", "housekeeping", "accountant"];

const SuperAdminRoleMatrix = () => {
  const [matrix, setMatrix] = useAppState<ModulePermission[]>("sa_role_matrix", defaultMatrix);
  const { logAction } = useAuditLog();
  const { pushNotification } = useSuperAdminNotifications();

  const fetchMatrixFromBackend = async () => {
    if (!canUseBackend() || !supabase) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("sa_role_matrix_config")
      .select("id,module,permissions")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error || !data) return;

    // Merge backend saved rows into defaultMatrix so all modules always appear.
    // Backend data overrides defaults for modules that were saved; rest keep defaults.
    const backendMap = new Map(
      (data as RoleMatrixDbRow[]).map((row) => [row.module, row.permissions])
    );

    setMatrix(
      defaultMatrix.map((row) => ({
        module: row.module,
        permissions: backendMap.has(row.module) ? backendMap.get(row.module)! : row.permissions,
      })),
    );
  };

  useEffect(() => {
    void fetchMatrixFromBackend();
  }, []);

  const togglePermission = async (module: string, role: RoleKey, checked: boolean) => {
    const previousMatrix = matrix || [];
    const nextMatrix = (matrix || []).map((item) =>
      item.module === module
        ? {
            ...item,
            permissions: {
              ...item.permissions,
              [role]: checked,
            },
          }
        : item,
    );

    setMatrix(nextMatrix);

    if (canUseBackend() && supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMatrix(previousMatrix);
        toast({ title: "Session required", description: "Please login again.", variant: "destructive" });
        return;
      }

      const target = nextMatrix.find((item) => item.module === module);
      if (!target) {
        setMatrix(previousMatrix);
        return;
      }

      const { error } = await supabase
        .from("sa_role_matrix_config")
        .upsert(
          {
            user_id: user.id,
            module,
            permissions: target.permissions,
          },
          { onConflict: "user_id,module" },
        );

      if (error) {
        setMatrix(previousMatrix);
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
        return;
      }
    }

    const status = checked ? "enabled" : "disabled";
    logAction({
      module: "superadmin-role-matrix",
      action: "toggle",
      details: `${status} ${role} access on ${module}`,
    });
    pushNotification({
      title: "Role Matrix Updated",
      message: `${role} access ${status} for ${module}.`,
      module: "superadmin-role-matrix",
      severity: "info",
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Role Matrix</h1>
        <p className="text-sm text-slate-600">Fine-grained module permissions for admin-side roles.</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Module Access Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-3 font-medium">Module</th>
                  {roles.map((role) => (
                    <th key={role} className="pb-3 font-medium capitalize">
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(matrix || []).map((row) => (
                  <tr key={row.module} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 font-medium text-slate-900">{row.module}</td>
                    {roles.map((role) => (
                      <td key={`${row.module}-${role}`} className="py-3">
                        <Switch
                          checked={row.permissions[role]}
                          onCheckedChange={(checked) => togglePermission(row.module, role, checked)}
                        />
                      </td>
                    ))}
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

export default SuperAdminRoleMatrix;
