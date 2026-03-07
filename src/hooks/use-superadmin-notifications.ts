import { useAppState } from "@/hooks/use-app-state";

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
  const [notifications, setNotifications] = useAppState<SuperAdminNotification[]>("sa_notifications", []);

  const pushNotification = (params: {
    title: string;
    message: string;
    module: string;
    severity?: "info" | "success" | "warning" | "error";
  }) => {
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
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => (prev || []).map((item) => (item.id === id ? { ...item, read: true } : item)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => (prev || []).map((item) => ({ ...item, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => (prev || []).filter((item) => item.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
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
