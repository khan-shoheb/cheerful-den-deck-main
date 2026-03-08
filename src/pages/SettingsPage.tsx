import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { useAppState } from "@/hooks/use-app-state";
import { canUseBackend, fetchSettings, upsertSettings } from "@/lib/hotel-api";

type NotificationKey = "newBookings" | "checkInReminders" | "paymentAlerts" | "housekeepingUpdates";

const notificationItems: Array<{ key: NotificationKey; label: string }> = [
  { key: "newBookings", label: "New bookings" },
  { key: "checkInReminders", label: "Check-in reminders" },
  { key: "paymentAlerts", label: "Payment alerts" },
  { key: "housekeepingUpdates", label: "Housekeeping updates" },
];

type SettingsData = {
  property: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  notifications: Record<NotificationKey, boolean>;
  payments: {
    merchantName: string;
    upiVpa: string;
  };
};

const defaultSettings: SettingsData = {
  property: {
    name: "LodgeOS Hotel",
    email: "admin@lodgeos.com",
    phone: "+1 555-0000",
    address: "123 Hotel Street, City, State 12345",
  },
  notifications: {
    newBookings: true,
    checkInReminders: true,
    paymentAlerts: true,
    housekeepingUpdates: true,
  },
  payments: {
    merchantName: "LodgeOS Hotel",
    upiVpa: "",
  },
};

const SettingsPage = () => {
  const [settings, setSettings] = useAppState<SettingsData>("rm_settings", defaultSettings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!canUseBackend()) return;

    let cancelled = false;

    (async () => {
      const remoteSettings = await fetchSettings();
      if (!remoteSettings || cancelled) return;
      setSettings((prev) => ({
        ...defaultSettings,
        ...prev,
        ...remoteSettings,
        property: {
          ...defaultSettings.property,
          ...(prev?.property ?? {}),
          ...(remoteSettings.property ?? {}),
        },
        notifications: {
          ...defaultSettings.notifications,
          ...(prev?.notifications ?? {}),
          ...(remoteSettings.notifications ?? {}),
        },
        payments: {
          ...defaultSettings.payments,
          ...(prev?.payments ?? {}),
          ...(remoteSettings.payments ?? {}),
        },
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [setSettings]);

  // Ensure settings has all required fields
  const safeSettings: SettingsData = {
    property: settings?.property || defaultSettings.property,
    notifications: settings?.notifications || defaultSettings.notifications,
    payments: settings?.payments || defaultSettings.payments,
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (canUseBackend()) {
        const ok = await upsertSettings(safeSettings);
        if (!ok) {
          toast({
            title: "Settings save failed",
            description: "Unable to save settings in backend. Please re-login and try again.",
            variant: "destructive",
          });
          return;
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      toast({
        title: "Settings saved",
        description: "Your property settings have been updated.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your property settings</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Property Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="property-name">Property Name</Label>
            <Input
              id="property-name"
              value={safeSettings.property.name}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  property: { ...(prev?.property || defaultSettings.property), name: e.target.value },
                  payments: {
                    ...(prev?.payments || defaultSettings.payments),
                    merchantName: (prev?.payments?.merchantName || e.target.value),
                  },
                }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="property-email">Email</Label>
              <Input
                id="property-email"
                type="email"
                value={safeSettings.property.email}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    property: { ...(prev?.property || defaultSettings.property), email: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="property-phone">Phone</Label>
              <Input
                id="property-phone"
                value={safeSettings.property.phone}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    property: { ...(prev?.property || defaultSettings.property), phone: e.target.value },
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="property-address">Address</Label>
            <Input
              id="property-address"
              value={safeSettings.property.address}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  property: { ...(prev?.property || defaultSettings.property), address: e.target.value },
                }))
              }
            />
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Payments (India)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payments-merchant">Merchant Name</Label>
              <Input
                id="payments-merchant"
                value={safeSettings.payments.merchantName}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    payments: { ...(prev?.payments || defaultSettings.payments), merchantName: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payments-upi">UPI ID (VPA)</Label>
              <Input
                id="payments-upi"
                placeholder="e.g. hotel@upi"
                value={safeSettings.payments.upiVpa}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    payments: { ...(prev?.payments || defaultSettings.payments), upiVpa: e.target.value },
                  }))
                }
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            This UPI ID is used to generate a payment link from invoices.
          </p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <Label className="text-sm" htmlFor={`notif-${item.key}`}>
                {item.label}
              </Label>
              <Switch
                id={`notif-${item.key}`}
                checked={safeSettings.notifications[item.key]}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    notifications: {
                      ...(prev?.notifications || defaultSettings.notifications),
                      [item.key]: checked,
                    },
                  }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
