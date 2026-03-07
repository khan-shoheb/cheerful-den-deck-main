import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const settings = [
  {
    key: "enforceMfa",
    title: "Enforce MFA for all admins",
    description: "Require multi-factor authentication before entering any admin dashboard.",
    enabled: true,
  },
  {
    key: "ipRestriction",
    title: "Restrict by office IP",
    description: "Allow superadmin actions only from approved office networks.",
    enabled: false,
  },
  {
    key: "criticalAlertEmail",
    title: "Send critical alerts to leadership",
    description: "Email severe security incidents to platform leadership automatically.",
    enabled: true,
  },
];

const SuperAdminSettings = () => {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Platform Security Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {settings.map((setting) => (
          <div key={setting.key} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
            <div>
              <p className="font-medium text-slate-900">{setting.title}</p>
              <p className="text-sm text-slate-600">{setting.description}</p>
            </div>
            <Switch defaultChecked={setting.enabled} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SuperAdminSettings;
