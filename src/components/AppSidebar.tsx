import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessRoute, roleLabelMap } from "@/lib/access";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BedDouble,
  CalendarCheck,
  Users,
  CreditCard,
  Sparkles,
  UserCog,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Rooms", icon: BedDouble, path: "/rooms" },
  { label: "Bookings", icon: CalendarCheck, path: "/bookings" },
  { label: "Guests", icon: Users, path: "/guests" },
  { label: "Billing", icon: CreditCard, path: "/billing" },
  { label: "Housekeeping", icon: Sparkles, path: "/housekeeping" },
  { label: "Staff", icon: UserCog, path: "/staff" },
  { label: "Reports", icon: BarChart3, path: "/reports" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

type AppSidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

const AppSidebar = ({ mobile = false, onNavigate }: AppSidebarProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const visibleNavItems = navItems.filter((item) => canAccessRoute(user?.role, item.path));

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };
  return (
    <aside
      className={cn(
        "flex w-64 flex-col bg-sidebar-bg",
        mobile ? "h-full" : "fixed left-0 top-0 z-40 h-screen",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <CalendarCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-sidebar-header">Room Management</h1>
          <p className="text-xs text-sidebar-fg">Management Suite</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-header",
              ].join(" ")
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
            {user?.name?.slice(0, 2).toUpperCase() || "RM"}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-sidebar-header">{user?.name || "Guest"}</p>
            <p className="text-xs text-sidebar-fg">{(user?.role && roleLabelMap[user.role]) || "User"}</p>
          </div>
          <button onClick={handleLogout} className="text-sidebar-fg hover:text-sidebar-header transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
