import { useAppState } from "@/hooks/use-app-state";
import { useAuth } from "@/contexts/AuthContext";

export type AuditLogEntry = {
  id: string;
  timestamp: string;
  module: string;
  action: string;
  details: string;
  userName: string;
  userRole: string;
};

export const useAuditLog = () => {
  const [entries, setEntries] = useAppState<AuditLogEntry[]>("rm_audit_logs", []);
  const { user } = useAuth();

  const logAction = (params: { module: string; action: string; details: string }) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (crypto as any).randomUUID()
        : String(Date.now());

    const entry: AuditLogEntry = {
      id,
      timestamp: new Date().toISOString(),
      module: params.module,
      action: params.action,
      details: params.details,
      userName: user?.name || "System",
      userRole: user?.role || "admin",
    };

    setEntries((prev) => [entry, ...prev].slice(0, 500));
  };

  return { entries, logAction };
};
