import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/hooks/use-app-state";
import { canUseBackend } from "@/lib/hotel-api";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

type PlatformSettings = {
  enforceMfa: boolean;
  ipRestriction: boolean;
  criticalAlertEmail: boolean;
};

const defaultSettings: PlatformSettings = {
  enforceMfa: true,
  ipRestriction: false,
  criticalAlertEmail: true,
};

const SuperAdminSettings = () => {
  const [settings, setSettings] = useAppState<PlatformSettings>("sa_platform_settings", defaultSettings);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    if (!canUseBackend() || !supabase) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("sa_platform_settings")
      .select("settings")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data || !data.settings) return;
    setSettings({ ...defaultSettings, ...(data.settings as Partial<PlatformSettings>) });
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  const saveSettings = async () => {
    if (!canUseBackend() || !supabase) {
      toast({ title: "Saved", description: "Settings stored in local app state." });
      return;
    }

    setIsSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsSaving(false);
      toast({ title: "Session required", description: "Please login again.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("sa_platform_settings").upsert(
      {
        user_id: user.id,
        settings,
      },
      { onConflict: "user_id" },
    );

    setIsSaving(false);

    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Saved", description: "Platform settings updated successfully." });
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Platform Security Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
          <div>
            <p className="font-medium text-slate-900">Enforce MFA for all admins</p>
            <p className="text-sm text-slate-600">Require multi-factor authentication before entering any admin dashboard.</p>
          </div>
          <Switch checked={settings.enforceMfa} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, enforceMfa: checked }))} />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
          <div>
            <p className="font-medium text-slate-900">Restrict by office IP</p>
            <p className="text-sm text-slate-600">Allow superadmin actions only from approved office networks.</p>
          </div>
          <Switch checked={settings.ipRestriction} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, ipRestriction: checked }))} />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
          <div>
            <p className="font-medium text-slate-900">Send critical alerts to leadership</p>
            <p className="text-sm text-slate-600">Email severe security incidents to platform leadership automatically.</p>
          </div>
          <Switch checked={settings.criticalAlertEmail} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, criticalAlertEmail: checked }))} />
        </div>

        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SuperAdminSettings;
