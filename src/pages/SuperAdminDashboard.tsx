import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Building2, ShieldCheck, UserCog } from "lucide-react";

const stats = [
  { label: "Total Properties", value: "38", icon: Building2, tone: "text-cyan-700" },
  { label: "Active Admin Accounts", value: "27", icon: UserCog, tone: "text-emerald-700" },
  { label: "Security Events", value: "4", icon: AlertTriangle, tone: "text-amber-700" },
  { label: "Policies Enforced", value: "12", icon: ShieldCheck, tone: "text-indigo-700" },
];

const incidents = [
  { event: "Failed login threshold reached", property: "Delhi Central", level: "high", time: "2m ago" },
  { event: "Permission changed for Billing module", property: "Jaipur Palace", level: "medium", time: "18m ago" },
  { event: "New admin invited", property: "Goa Bay", level: "low", time: "35m ago" },
];

const SuperAdminDashboard = () => {
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
