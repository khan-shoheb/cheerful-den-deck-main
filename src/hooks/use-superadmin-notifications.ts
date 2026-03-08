import { useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "@/hooks/use-app-state";
import { supabase } from "@/lib/supabase";
import { canUseBackend } from "@/lib/hotel-api";

export type SuperAdminNotification = {
  id: string;
  title: string;
  message: string;
  module: string;
  severity: "info" | "success" | "warning" | "error";
  createdAt: string;
  read: boolean;
};

export const useSuperAdminNotifications = () => {
  const [cachedNotifications, setCachedNotifications] = useAppState<SuperAdminNotification[]>("sa_notifications", []);
  const [notifications, setNotifications] = useState<SuperAdminNotification[]>(cachedNotifications || []);
  const recentNotificationMapRef = useRef<Record<string, number>>({});

  const backendEnabled = useMemo(() => canUseBackend() && Boolean(supabase), []);

  const fetchNotifications = async () => {
    if (!backendEnabled || !supabase) {
      setNotifications(cachedNotifications || []);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setNotifications(cachedNotifications || []);
      return;
    }

    const { data, error } = await supabase
      .from("sa_notifications")
      .select("id,title,message,module,severity,is_read,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(250);

    if (error || !data) {
      setNotifications(cachedNotifications || []);
      return;
    }

    const mapped: SuperAdminNotification[] = data.map((item) => ({
      id: item.id,
      title: item.title,
      message: item.message,
      module: item.module,
      severity: (item.severity as SuperAdminNotification["severity"]) || "info",
      createdAt: item.created_at,
      read: Boolean(item.is_read),
    }));

    setNotifications(mapped);
    setCachedNotifications(mapped);
  };

  useEffect(() => {
    if (!backendEnabled) {
      setNotifications(cachedNotifications || []);
      return;
    }
    void fetchNotifications();
  }, [backendEnabled]);

  useEffect(() => {
    if (!backendEnabled) {
      setNotifications(cachedNotifications || []);
    }
  }, [backendEnabled, cachedNotifications]);

  const pushNotification = (params: {
    title: string;
    message: string;
    module: string;
    severity?: "info" | "success" | "warning" | "error";
  }) => {
    const dedupeWindowMs = 15000;
    const dedupeKey = `${params.module}|${params.title}|${params.message}`;
    const now = Date.now();
    const lastAt = recentNotificationMapRef.current[dedupeKey] ?? 0;
    if (now - lastAt < dedupeWindowMs) {
      return;
    }
    recentNotificationMapRef.current[dedupeKey] = now;

    // Keep the in-memory dedupe map small over time.
    Object.entries(recentNotificationMapRef.current).forEach(([key, at]) => {
      if (now - at > 2 * 60 * 1000) {
        delete recentNotificationMapRef.current[key];
      }
    });

    const item: SuperAdminNotification = {
      id: crypto.randomUUID(),
      title: params.title,
      message: params.message,
      module: params.module,
      severity: params.severity || "info",
      createdAt: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => [item, ...(prev || [])].slice(0, 250));
    setCachedNotifications((prev) => [item, ...(prev || [])].slice(0, 250));

    if (backendEnabled && supabase) {
      void (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        await supabase.from("sa_notifications").insert({
          user_id: user.id,
          title: item.title,
          message: item.message,
          module: item.module,
          severity: item.severity,
          is_read: false,
        });
      })();
    }
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => (prev || []).map((item) => (item.id === id ? { ...item, read: true } : item)));
    setCachedNotifications((prev) => (prev || []).map((item) => (item.id === id ? { ...item, read: true } : item)));

    if (backendEnabled && supabase) {
      void (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from("sa_notifications").update({ is_read: true }).eq("user_id", user.id).eq("id", id);
      })();
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => (prev || []).map((item) => ({ ...item, read: true })));
    setCachedNotifications((prev) => (prev || []).map((item) => ({ ...item, read: true })));

    if (backendEnabled && supabase) {
      void (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from("sa_notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
      })();
    }
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => (prev || []).filter((item) => item.id !== id));
    setCachedNotifications((prev) => (prev || []).filter((item) => item.id !== id));

    if (backendEnabled && supabase) {
      void (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from("sa_notifications").delete().eq("user_id", user.id).eq("id", id);
      })();
    }
  };

  const clearAll = () => {
    setNotifications([]);
    setCachedNotifications([]);

    if (backendEnabled && supabase) {
      void (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from("sa_notifications").delete().eq("user_id", user.id);
      })();
    }
  };

  const unreadCount = (notifications || []).filter((item) => !item.read).length;

  return {
    notifications: notifications || [],
    unreadCount,
    pushNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
};
