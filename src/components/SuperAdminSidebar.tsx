import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessRoute, roleLabelMap } from "@/lib/access";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useSuperAdminNotifications } from "@/hooks/use-superadmin-notifications";
import {
  ShieldCheck,
  LayoutDashboard,
  UsersRound,
  ScrollText,
  Settings,
  Building2,
  KeyRound,
  Megaphone,
  CheckSquare,
  Trash2,
  Bell,
  Grid2x2,
  LogOut,
} from "lucide-react";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/superadmin" },
  { label: "Properties", icon: Building2, path: "/superadmin/properties" },
  { label: "Admin Users", icon: UsersRound, path: "/superadmin/admin-users" },
  { label: "Permissions", icon: KeyRound, path: "/superadmin/permissions" },
  { label: "Audit Logs", icon: ScrollText, path: "/superadmin/audit-logs" },
  { label: "Announcements", icon: Megaphone, path: "/superadmin/announcements" },
  { label: "Approvals", icon: CheckSquare, path: "/superadmin/approvals" },
  { label: "Recycle Bin", icon: Trash2, path: "/superadmin/recycle-bin" },
  { label: "Notifications", icon: Bell, path: "/superadmin/notifications" },
  { label: "Role Matrix", icon: Grid2x2, path: "/superadmin/role-matrix" },
  { label: "Platform Settings", icon: Settings, path: "/superadmin/platform-settings" },
];

type SuperAdminSidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

const SuperAdminSidebar = ({ mobile = false, onNavigate }: SuperAdminSidebarProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadCount } = useSuperAdminNotifications();
  const visibleNavItems = navItems.filter((item) => canAccessRoute(user?.role, item.path));

  const handleLogout = async () => {
    await logout();
    navigate("/superadmin/login");
  };

  return (
    <aside
      className={cn(
        "flex w-72 flex-col bg-slate-900",
        mobile ? "h-full" : "fixed left-0 top-0 z-40 h-screen",
      )}
    >
      <div className="flex items-center gap-3 border-b border-slate-800 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-100">Super Admin</h1>
          <p className="text-xs text-slate-400">Platform Control Center</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/superadmin"}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-cyan-500 text-slate-950" : "text-slate-300 hover:bg-slate-800 hover:text-white",
              ].join(" ")
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
            {item.path === "/superadmin/notifications" && unreadCount > 0 && (
              <Badge variant="secondary" className="ml-auto bg-cyan-200 text-cyan-900">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-semibold text-cyan-300">
            {user?.name?.slice(0, 2).toUpperCase() || "SA"}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-100">{user?.name || "Super Admin"}</p>
            <p className="text-xs text-slate-400">{(user?.role && roleLabelMap[user.role]) || "User"}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-400 transition-colors hover:text-white">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default SuperAdminSidebar;
