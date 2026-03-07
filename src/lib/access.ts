import type { AppRole } from "@/contexts/AuthContext";

export const roleLabelMap: Record<AppRole, string> = {
  admin: "Admin",
  superadmin: "Super Admin",
  manager: "Manager",
  frontdesk: "Front Desk",
  housekeeping: "Housekeeping",
  accountant: "Accountant",
};

const routeAccessMap: Record<string, AppRole[]> = {
  "/": ["admin", "manager", "frontdesk", "housekeeping", "accountant"],
  "/rooms": ["admin", "manager", "frontdesk", "housekeeping"],
  "/bookings": ["admin", "manager", "frontdesk"],
  "/guests": ["admin", "manager", "frontdesk"],
  "/billing": ["admin", "manager", "accountant"],
  "/housekeeping": ["admin", "manager", "housekeeping"],
  "/staff": ["admin", "manager"],
  "/reports": ["admin", "manager", "accountant"],
  "/settings": ["admin", "manager"],
  "/superadmin": ["superadmin"],
  "/superadmin/properties": ["superadmin"],
  "/superadmin/admin-users": ["superadmin"],
  "/superadmin/permissions": ["superadmin"],
  "/superadmin/audit-logs": ["superadmin"],
  "/superadmin/announcements": ["superadmin"],
  "/superadmin/approvals": ["superadmin"],
  "/superadmin/recycle-bin": ["superadmin"],
  "/superadmin/notifications": ["superadmin"],
  "/superadmin/role-matrix": ["superadmin"],
  "/superadmin/platform-settings": ["superadmin"],
};

export const canAccessRoute = (role: AppRole | undefined, routePath: string) => {
  if (!role) return false;
  const allowedRoles = routeAccessMap[routePath];
  if (!allowedRoles) return true;
  return allowedRoles.includes(role);
};
