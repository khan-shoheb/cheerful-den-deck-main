import { completeAdminPasswordReset, validateAdminAccess } from "@/lib/admin-auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AppRole = "admin" | "superadmin" | "manager" | "frontdesk" | "housekeeping" | "accountant";
type LoginResult = { success: true } | { success: false; error: string };

const toFriendlyAuthError = (message: string, loginAs: "admin" | "superadmin"): string => {
  const lower = message.toLowerCase();

  if (lower.includes("failed to fetch") || lower.includes("network request failed")) {
    return "Network issue: unable to reach Supabase from this device. Check mobile internet/VPN/private DNS, then retry.";
  }

  if (lower.includes("invalid login credentials")) {
    return loginAs === "superadmin"
      ? "Invalid login credentials. Ensure this user exists in Supabase Auth Users and password is correct."
      : "Invalid login credentials. Please verify email/password for this Supabase project.";
  }

  if (lower.includes("email not confirmed")) {
    return "Email is not confirmed yet. Confirm the account from Supabase Auth before login.";
  }

  if (lower.includes("too many requests")) {
    return "Too many login attempts. Please wait a minute and try again.";
  }

  return message;
};

const normalizeRole = (value: unknown): AppRole => {
  const roleValue = typeof value === "string" ? value.trim().toLowerCase() : "";
  switch (roleValue) {
    case "admin":
    case "manager":
    case "frontdesk":
    case "housekeeping":
    case "accountant":
    case "superadmin":
      return roleValue;
    default:
      return "admin";
  }
};

const resolveRole = (params: { roleFromUserMeta?: unknown; roleFromAppMeta?: unknown; email?: string }): AppRole => {
  const fromUserMeta = normalizeRole(params.roleFromUserMeta);
  if (fromUserMeta === "superadmin") return "superadmin";

  const fromAppMeta = normalizeRole(params.roleFromAppMeta);
  if (fromAppMeta === "superadmin") return "superadmin";

  const normalizedEmail = typeof params.email === "string" ? params.email.trim().toLowerCase() : "";
  if (normalizedEmail === "superadmin@room.com") return "superadmin";

  return fromUserMeta;
};

interface AuthContextType {
  isAuthenticated: boolean;
  authUserId: string | null;
  user: { name: string; role: AppRole; email?: string; mustResetPassword?: boolean } | null;
  login: (
    email: string,
    password: string,
    loginAs?: "admin" | "superadmin",
  ) => Promise<LoginResult>;
  logout: () => Promise<void>;
  completePasswordReset: (newPassword: string) => Promise<LoginResult>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const useSupabase = useMemo(() => isSupabaseConfigured && Boolean(supabase), []);
  const MOCK_SUPERADMIN_EMAIL = "superadmin@room.com";
  const MOCK_SUPERADMIN_PASSWORD = "Super@123";
  const MOCK_ADMIN_EMAIL = "admin@hotel.com";
  const MOCK_ADMIN_PASSWORD = "Admin@123";

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return useSupabase ? false : localStorage.getItem("rm_auth") === "true";
  });
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [user, setUser] = useState<{ name: string; role: AppRole; email?: string; mustResetPassword?: boolean } | null>(() => {
    if (useSupabase) return null;
    const saved = localStorage.getItem("rm_user");
    if (!saved) return null;
    const parsed = JSON.parse(saved) as { name?: string; role?: string; email?: string };
    return {
      name: parsed.name || "User",
      role: normalizeRole(parsed.role),
      email: parsed.email,
      mustResetPassword: false,
    };
  });

  useEffect(() => {
    if (!useSupabase) return;

    let mounted = true;

    supabase!.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const session = data.session;
      setIsAuthenticated(Boolean(session));
      setAuthUserId(session?.user?.id ?? null);
      setUser(
        session?.user
          ? {
              name:
                (typeof session.user.user_metadata?.full_name === "string" && session.user.user_metadata.full_name) ||
                session.user.email?.split("@")[0] ||
                "User",
              role: resolveRole({
                roleFromUserMeta: session.user.user_metadata?.role,
                roleFromAppMeta: session.user.app_metadata?.role,
                email: session.user.email,
              }),
              email: session.user.email ?? undefined,
              mustResetPassword: localStorage.getItem("rm_force_password_reset") === "true",
            }
          : null,
      );
    });

    const { data: subscription } = supabase!.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
      setAuthUserId(session?.user?.id ?? null);
      setUser(
        session?.user
          ? {
              name:
                (typeof session.user.user_metadata?.full_name === "string" && session.user.user_metadata.full_name) ||
                session.user.email?.split("@")[0] ||
                "User",
              role: resolveRole({
                roleFromUserMeta: session.user.user_metadata?.role,
                roleFromAppMeta: session.user.app_metadata?.role,
                email: session.user.email,
              }),
              email: session.user.email ?? undefined,
              mustResetPassword: localStorage.getItem("rm_force_password_reset") === "true",
            }
          : null,
      );
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [useSupabase]);

  const login = useCallback<AuthContextType["login"]>(
    async (email: string, password: string, loginAs: "admin" | "superadmin" = "admin"): Promise<LoginResult> => {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();

      const applyLocalMockSession = (role: AppRole) => {
        const userData = { name: normalizedEmail.split("@")[0], role, email: normalizedEmail, mustResetPassword: false };
        setIsAuthenticated(true);
        setAuthUserId(`local-${role}`);
        setUser(userData);
        localStorage.setItem("rm_auth", "true");
        localStorage.setItem("rm_user", JSON.stringify(userData));
        localStorage.setItem("rm_auth_source", "local-mock");
        localStorage.removeItem("rm_force_password_reset");
      };

      const isAdminDemoMatch = normalizedEmail === MOCK_ADMIN_EMAIL && normalizedPassword === MOCK_ADMIN_PASSWORD;
      const isSuperAdminDemoMatch =
        normalizedEmail === MOCK_SUPERADMIN_EMAIL && normalizedPassword === MOCK_SUPERADMIN_PASSWORD;

      if (useSupabase) {
        const { data, error } = await supabase!.auth.signInWithPassword({
          email: normalizedEmail,
          password: normalizedPassword,
        });
        if (error) {
          const normalizedError = (error.message || "").toLowerCase();
          const isNetworkFetchIssue =
            normalizedError.includes("failed to fetch") || normalizedError.includes("network request failed");

          // If Supabase is temporarily unreachable on this device, allow explicit demo credentials as fallback.
          if (isNetworkFetchIssue && (isAdminDemoMatch || isSuperAdminDemoMatch)) {
            const role: AppRole = isSuperAdminDemoMatch ? "superadmin" : "admin";
            const isRoleAllowed = loginAs === "superadmin" ? role === "superadmin" : role !== "superadmin";
            if (isRoleAllowed) {
              applyLocalMockSession(role);
              return { success: true };
            }
          }

          return {
            success: false,
            error: toFriendlyAuthError(error.message || "Invalid credentials", loginAs),
          };
        }

        const role = resolveRole({
          roleFromUserMeta: data.user?.user_metadata?.role,
          roleFromAppMeta: data.user?.app_metadata?.role,
          email: data.user?.email,
        });
        const isRoleAllowed = loginAs === "superadmin" ? role === "superadmin" : role !== "superadmin";
        if (!isRoleAllowed) {
          await supabase!.auth.signOut();
          return {
            success: false,
            error:
              loginAs === "superadmin"
                ? "This account is not a superadmin."
                : "This account cannot be used for admin login.",
          };
        }

        if (loginAs === "admin") {
          try {
            const validation = await validateAdminAccess();
            if (!validation.authorized) {
              await supabase!.auth.signOut();
              localStorage.removeItem("rm_force_password_reset");
              return {
                success: false,
                error: validation.reason || "Admin access is not authorized yet.",
              };
            }
            const mustResetPassword = Boolean(validation.mustResetPassword);
            localStorage.setItem("rm_force_password_reset", mustResetPassword ? "true" : "false");
            setUser((prev) => (prev ? { ...prev, mustResetPassword } : prev));
          } catch (error) {
            await supabase!.auth.signOut();
            localStorage.removeItem("rm_force_password_reset");
            return {
              success: false,
              error: error instanceof Error ? error.message : "Unable to validate admin access.",
            };
          }
        } else {
          localStorage.removeItem("rm_force_password_reset");
        }

        localStorage.setItem("rm_auth_source", "supabase");

        return { success: true };
      }

      // Frontend-only mock login (fallback)
      if (normalizedEmail && normalizedPassword) {
        const role: AppRole = isSuperAdminDemoMatch ? "superadmin" : "admin";
        if (loginAs === "admin" && !isAdminDemoMatch) {
          return { success: false, error: "Invalid credentials" };
        }
        const isRoleAllowed = loginAs === "superadmin" ? role === "superadmin" : role !== "superadmin";
        if (!isRoleAllowed) {
          return { success: false, error: "Role mismatch for selected login type." };
        }

        applyLocalMockSession(role);
        return { success: true };
      }

      return { success: false, error: "Invalid credentials" };
    },
    [useSupabase],
  );

  const logout = useCallback(async () => {
    if (useSupabase) {
      await supabase!.auth.signOut();
    }
    setIsAuthenticated(false);
    setAuthUserId(null);
    setUser(null);
    localStorage.removeItem("rm_auth");
    localStorage.removeItem("rm_user");
    localStorage.removeItem("rm_auth_source");
    localStorage.removeItem("rm_force_password_reset");
  }, [useSupabase]);

  const completePasswordReset = useCallback<AuthContextType["completePasswordReset"]>(
    async (newPassword: string): Promise<LoginResult> => {
      const normalizedPassword = newPassword.trim();
      if (normalizedPassword.length < 8) {
        return { success: false, error: "Password must be at least 8 characters long." };
      }

      if (!useSupabase || !supabase) {
        return { success: false, error: "Password reset requires Supabase authentication." };
      }

      const { error } = await supabase.auth.updateUser({ password: normalizedPassword });
      if (error) {
        return { success: false, error: error.message || "Failed to update password." };
      }

      try {
        await completeAdminPasswordReset();
      } catch (updateError) {
        return {
          success: false,
          error: updateError instanceof Error ? updateError.message : "Password updated but reset flag update failed.",
        };
      }

      localStorage.setItem("rm_force_password_reset", "false");
      setUser((prev) => (prev ? { ...prev, mustResetPassword: false } : prev));
      return { success: true };
    },
    [useSupabase],
  );

  return (
    <AuthContext.Provider value={{ isAuthenticated, authUserId, user, login, logout, completePasswordReset }}>
      {children}
    </AuthContext.Provider>
  );
};
