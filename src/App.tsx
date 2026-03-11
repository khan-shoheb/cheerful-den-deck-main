import AppLayout from "@/components/AppLayout";
import SuperAdminLayout from "@/components/SuperAdminLayout";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppRole, AuthProvider, useAuth } from "@/contexts/AuthContext";
import { canAccessRoute } from "@/lib/access";
import Billing from "@/pages/Billing";
import Bookings from "@/pages/Bookings";
import Dashboard from "@/pages/Dashboard";
import ForcePasswordReset from "@/pages/ForcePasswordReset";
import Guests from "@/pages/Guests";
import Housekeeping from "@/pages/Housekeeping";
import Login from "@/pages/Login";
import Reports from "@/pages/Reports";
import Rooms from "@/pages/Rooms";
import SettingsPage from "@/pages/SettingsPage";
import Staff from "@/pages/Staff";
import SuperAdminAnnouncements from "@/pages/SuperAdminAnnouncements";
import SuperAdminAudit from "@/pages/SuperAdminAudit";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import SuperAdminLogin from "@/pages/SuperAdminLogin";
import SuperAdminNotifications from "@/pages/SuperAdminNotifications";
import SuperAdminPermissions from "@/pages/SuperAdminPermissions";
import SuperAdminProperties from "@/pages/SuperAdminProperties";
import SuperAdminRoleMatrix from "@/pages/SuperAdminRoleMatrix";
import SuperAdminSettings from "@/pages/SuperAdminSettings";
import SuperAdminUsers from "@/pages/SuperAdminUsers";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import NotFound from "./pages/NotFound";
import SuperAdminApprovals from "./pages/SuperAdminApprovals";
import SuperAdminRecycleBin from "./pages/SuperAdminRecycleBin";

const queryClient = new QueryClient();

const ProtectedRoute = ({
  children,
  allowedRoles,
  routePath,
  redirectTo = "/login",
  unauthorizedTo,
}: {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  routePath?: string;
  redirectTo?: string;
  unauthorizedTo?: string;
}) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to={redirectTo} replace />;

  if (user?.role !== "superadmin") {
    if (routePath === "/force-password-reset" && !user?.mustResetPassword) {
      return <Navigate to="/" replace />;
    }

    if (routePath !== "/force-password-reset" && user?.mustResetPassword) {
      return <Navigate to="/force-password-reset" replace />;
    }
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={unauthorizedTo || "/"} replace />;
  }
  if (routePath && !canAccessRoute(user?.role, routePath)) {
    return <Navigate to={unauthorizedTo || "/"} replace />;
  }
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/superadmin/login" element={<SuperAdminLogin />} />
            <Route
              path="/force-password-reset"
              element={
                <ProtectedRoute redirectTo="/login" routePath="/force-password-reset" unauthorizedTo="/">
                  <ForcePasswordReset />
                </ProtectedRoute>
              }
            />

            <Route element={<ProtectedRoute redirectTo="/login" unauthorizedTo="/"><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<ProtectedRoute routePath="/" unauthorizedTo="/superadmin"><Dashboard /></ProtectedRoute>} />
              <Route path="/rooms" element={<ProtectedRoute routePath="/rooms" unauthorizedTo="/superadmin"><Rooms /></ProtectedRoute>} />
              <Route path="/bookings" element={<ProtectedRoute routePath="/bookings" unauthorizedTo="/superadmin"><Bookings /></ProtectedRoute>} />
              <Route path="/guests" element={<ProtectedRoute routePath="/guests" unauthorizedTo="/superadmin"><Guests /></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute routePath="/billing" unauthorizedTo="/superadmin"><Billing /></ProtectedRoute>} />
              <Route path="/housekeeping" element={<ProtectedRoute routePath="/housekeeping" unauthorizedTo="/superadmin"><Housekeeping /></ProtectedRoute>} />
              <Route path="/staff" element={<ProtectedRoute routePath="/staff" unauthorizedTo="/superadmin"><Staff /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute routePath="/reports" unauthorizedTo="/superadmin"><Reports /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute routePath="/settings" unauthorizedTo="/superadmin"><SettingsPage /></ProtectedRoute>} />
            </Route>

            <Route
              path="/superadmin"
              element={
                <ProtectedRoute allowedRoles={["superadmin"]} redirectTo="/superadmin/login" unauthorizedTo="/">
                  <SuperAdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ProtectedRoute routePath="/superadmin" allowedRoles={["superadmin"]} redirectTo="/superadmin/login"><SuperAdminDashboard /></ProtectedRoute>} />
              <Route path="properties" element={<ProtectedRoute routePath="/superadmin/properties" allowedRoles={["superadmin"]} redirectTo="/superadmin/login"><SuperAdminProperties /></ProtectedRoute>} />
              <Route path="admin-users" element={<ProtectedRoute routePath="/superadmin/admin-users" allowedRoles={["superadmin"]} redirectTo="/superadmin/login"><SuperAdminUsers /></ProtectedRoute>} />
              <Route path="permissions" element={<ProtectedRoute routePath="/superadmin/permissions" allowedRoles={["superadmin"]} redirectTo="/superadmin/login"><SuperAdminPermissions /></ProtectedRoute>} />
              <Route path="audit-logs" element={<ProtectedRoute routePath="/superadmin/audit-logs" allowedRoles={["superadmin"]} redirectTo="/superadmin/login"><SuperAdminAudit /></ProtectedRoute>} />
              <Route path="announcements" element={<ProtectedRoute routePath="/superadmin/announcements" allowedRoles={["superadmin"]} redirectTo="/superadmin/login"><SuperAdminAnnouncements /></ProtectedRoute>} />
              <Route path="approvals" element={<ProtectedRoute routePath="/superadmin/approvals" allowedRoles={["superadmin"]} redirectTo="/superadmin/login"><SuperAdminApprovals /></ProtectedRoute>} />
              <Route path="recycle-bin" element={<ProtectedRoute routePath="/superadmin/recycle-bin" allowedRoles={["superadmin"]} redirectTo="/superadmin/login"><SuperAdminRecycleBin /></ProtectedRoute>} />
              <Route path="notifications" element={<ProtectedRoute routePath="/superadmin/notifications" allowedRoles={["superadmin"]} redirectTo="/superadmin/login"><SuperAdminNotifications /></ProtectedRoute>} />
              <Route path="role-matrix" element={<ProtectedRoute routePath="/superadmin/role-matrix" allowedRoles={["superadmin"]} redirectTo="/superadmin/login"><SuperAdminRoleMatrix /></ProtectedRoute>} />
              <Route path="platform-settings" element={<ProtectedRoute routePath="/superadmin/platform-settings" allowedRoles={["superadmin"]} redirectTo="/superadmin/login"><SuperAdminSettings /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
