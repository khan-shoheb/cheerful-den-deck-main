import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Building2, ShieldCheck, UserCog } from "lucide-react";
import { canUseBackend } from "@/lib/hotel-api";
import { supabase } from "@/lib/supabase";
import { useAppState } from "@/hooks/use-app-state";

type SaPropertyRow = {
  id: string;
  name: string;
  city: string;
  admins_count: number;
  occupancy: string;
  health_status: "Healthy" | "Watch" | "Needs Review";
  approval_status: "Pending" | "Approved" | "Rejected";
};

type SaNotificationRow = {
  id: string;
  title: string;
  message: string;
  module: string;
  severity: "info" | "success" | "warning" | "error";
  created_at: string;
};

type IncidentRow = {
  event: string;
  property: string;
  level: "high" | "medium" | "low";
  time: string;
};

type AppStateProperty = {
  id: string;
  name: string;
  city: string;
  admins: number;
  occupancy: string;
  status: "Healthy" | "Watch" | "Needs Review";
};

type PermissionPolicy = {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
};

const getRelativeTime = (isoDate: string) => {
  const target = new Date(isoDate);
  if (Number.isNaN(target.getTime())) return "just now";

  const diffMs = Date.now() - target.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
};

const SuperAdminDashboard = () => {
  const [propertiesFallback] = useAppState<AppStateProperty[]>("sa_properties", []);
  const [policies] = useAppState<PermissionPolicy[]>("sa_permissions", []);

  const [properties, setProperties] = useState<SaPropertyRow[]>([]);
  const [notifications, setNotifications] = useState<SaNotificationRow[]>([]);
  const [backendEnforcedPolicies, setBackendEnforcedPolicies] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!canUseBackend() || !supabase) {
      setIsLoaded(true);
      return;
    }

    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        setIsLoaded(true);
        return;
      }

      const [propertiesRes, notificationsRes, policiesRes] = await Promise.all([
        supabase
          .from("sa_properties")
          .select("id,name,city,admins_count,occupancy,health_status,approval_status")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false }),
        supabase
          .from("sa_notifications")
          .select("id,title,message,module,severity,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("sa_permission_policies")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("enabled", true),
      ]);

      if (cancelled) return;

      if (!propertiesRes.error && propertiesRes.data) {
        setProperties((propertiesRes.data as SaPropertyRow[]) ?? []);
      }

      if (!notificationsRes.error && notificationsRes.data) {
        setNotifications((notificationsRes.data as SaNotificationRow[]) ?? []);
      }

      if (!policiesRes.error) {
        setBackendEnforcedPolicies(policiesRes.count ?? 0);
      }

      setIsLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveProperties = useMemo(() => {
    if (properties.length > 0) return properties;
    return propertiesFallback.map((row) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      admins_count: Number(row.admins || 0),
      occupancy: row.occupancy,
      health_status: row.status,
      approval_status: "Approved" as const,
    }));
  }, [properties, propertiesFallback]);

  const securityEventsCount = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return notifications.filter((item) => {
      const created = new Date(item.created_at).getTime();
      return created >= since && (item.severity === "warning" || item.severity === "error");
    }).length;
  }, [notifications]);

  const activeAdmins = useMemo(() => {
    return effectiveProperties.reduce((sum, row) => sum + Number(row.admins_count || 0), 0);
  }, [effectiveProperties]);

  const enforcedPolicies = useMemo(() => {
    if (backendEnforcedPolicies !== null) return backendEnforcedPolicies;
    return (policies || []).filter((policy) => policy.enabled).length;
  }, [backendEnforcedPolicies, policies]);

  const stats = [
    { label: "Total Properties", value: String(effectiveProperties.length), icon: Building2, tone: "text-cyan-700" },
    { label: "Active Admin Accounts", value: String(activeAdmins), icon: UserCog, tone: "text-emerald-700" },
    { label: "Security Events (24h)", value: String(securityEventsCount), icon: AlertTriangle, tone: "text-amber-700" },
    { label: "Policies Enforced", value: String(enforcedPolicies), icon: ShieldCheck, tone: "text-indigo-700" },
  ];

  const incidents = useMemo<IncidentRow[]>(() => {
    if (notifications.length > 0) {
      return notifications.slice(0, 5).map((item) => ({
        event: item.title,
        property: item.module || "platform",
        level: item.severity === "error" ? "high" : item.severity === "warning" ? "medium" : "low",
        time: getRelativeTime(item.created_at),
      }));
    }

    return effectiveProperties.slice(0, 5).map((row) => ({
      event: `Health status is ${row.health_status}`,
      property: row.name,
      level: row.health_status === "Needs Review" ? "high" : row.health_status === "Watch" ? "medium" : "low",
      time: "recent",
    }));
  }, [effectiveProperties, notifications]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Super Admin Dashboard</h1>
        <p className="text-sm text-slate-600">Cross-property controls, governance, and security visibility.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-slate-200 shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{stat.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
              <div className={`rounded-lg bg-slate-100 p-2 ${stat.tone}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Recent Platform Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isLoaded && incidents.length === 0 && <p className="text-sm text-slate-500">Loading dashboard metrics...</p>}

          {incidents.map((incident, index) => (
            <div key={index} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <p className="font-medium text-slate-900">{incident.event}</p>
              <Badge
                variant="secondary"
                className={
                  incident.level === "high"
                    ? "bg-red-100 text-red-700"
                    : incident.level === "medium"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                }
              >
                {incident.level}
              </Badge>
              <p className="ml-auto text-sm text-slate-500">
                {incident.property} | {incident.time}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;
