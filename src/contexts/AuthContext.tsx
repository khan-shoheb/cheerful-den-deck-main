import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type AppRole = "admin" | "superadmin" | "manager" | "frontdesk" | "housekeeping" | "accountant";

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
  user: { name: string; role: AppRole; email?: string } | null;
  login: (email: string, password: string, loginAs?: "admin" | "superadmin") => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const useSupabase = useMemo(() => isSupabaseConfigured && Boolean(supabase), []);
  const MOCK_SUPERADMIN_EMAIL = "superadmin@room.com";
  const MOCK_SUPERADMIN_PASSWORD = "Super@123";
  const MOCK_ADMIN_EMAIL = "sujalpatne583@gmail.com";
  const MOCK_ADMIN_PASSWORD = "Sujal@123";

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return useSupabase ? false : localStorage.getItem("rm_auth") === "true";
  });
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [user, setUser] = useState<{ name: string; role: AppRole; email?: string } | null>(() => {
    if (useSupabase) return null;
    const saved = localStorage.getItem("rm_user");
    if (!saved) return null;
    const parsed = JSON.parse(saved) as { name?: string; role?: string; email?: string };
    return {
      name: parsed.name || "User",
      role: normalizeRole(parsed.role),
      email: parsed.email,
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
            }
          : null,
      );
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [useSupabase]);

  const login = useCallback(
    async (email: string, password: string, loginAs: "admin" | "superadmin" = "admin") => {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();
      const canUseLocalSuperadminFallback =
        loginAs === "superadmin" &&
        normalizedEmail === MOCK_SUPERADMIN_EMAIL &&
        normalizedPassword === MOCK_SUPERADMIN_PASSWORD;
      const canUseLocalAdminFallback =
        loginAs === "admin" &&
        normalizedEmail === MOCK_ADMIN_EMAIL &&
        normalizedPassword === MOCK_ADMIN_PASSWORD;

      if (useSupabase) {
        const { data, error } = await supabase!.auth.signInWithPassword({
          email: normalizedEmail,
          password: normalizedPassword,
        });
        if (error) {
          if (canUseLocalSuperadminFallback) {
            const userData = { name: "superadmin", role: "superadmin" as AppRole, email: normalizedEmail };
            setIsAuthenticated(true);
            setAuthUserId("local-superadmin");
            setUser(userData);
            localStorage.setItem("rm_auth", "true");
            localStorage.setItem("rm_user", JSON.stringify(userData));
            return true;
          }
          if (canUseLocalAdminFallback) {
            const userData = { name: "sujal", role: "admin" as AppRole, email: normalizedEmail };
            setIsAuthenticated(true);
            setAuthUserId("local-admin");
            setUser(userData);
            localStorage.setItem("rm_auth", "true");
            localStorage.setItem("rm_user", JSON.stringify(userData));
            return true;
          }
          return false;
        }

        const role = resolveRole({
          roleFromUserMeta: data.user?.user_metadata?.role,
          roleFromAppMeta: data.user?.app_metadata?.role,
          email: data.user?.email,
        });
        const isRoleAllowed = loginAs === "superadmin" ? role === "superadmin" : role !== "superadmin";
        if (!isRoleAllowed) {
          await supabase!.auth.signOut();

          // Fallback for demo/dev when metadata is not propagated yet.
          if (canUseLocalSuperadminFallback) {
            const userData = { name: "superadmin", role: "superadmin" as AppRole, email: normalizedEmail };
            setIsAuthenticated(true);
            setAuthUserId("local-superadmin");
            setUser(userData);
            localStorage.setItem("rm_auth", "true");
            localStorage.setItem("rm_user", JSON.stringify(userData));
            return true;
          }
          if (canUseLocalAdminFallback) {
            const userData = { name: "sujal", role: "admin" as AppRole, email: normalizedEmail };
            setIsAuthenticated(true);
            setAuthUserId("local-admin");
            setUser(userData);
            localStorage.setItem("rm_auth", "true");
            localStorage.setItem("rm_user", JSON.stringify(userData));
            return true;
          }

          return false;
        }

        return true;
      }

      // Frontend-only mock login (fallback)
      if (normalizedEmail && normalizedPassword) {
        const isAdminMatch = normalizedEmail === MOCK_ADMIN_EMAIL && normalizedPassword === MOCK_ADMIN_PASSWORD;
        const isSuperAdminMatch =
          normalizedEmail === MOCK_SUPERADMIN_EMAIL && normalizedPassword === MOCK_SUPERADMIN_PASSWORD;
        const role: AppRole = isSuperAdminMatch ? "superadmin" : "admin";
        if (loginAs === "admin" && !isAdminMatch) return false;
        const isRoleAllowed = loginAs === "superadmin" ? role === "superadmin" : role !== "superadmin";
        if (!isRoleAllowed) return false;

        const userData = { name: normalizedEmail.split("@")[0], role, email: normalizedEmail };
        setIsAuthenticated(true);
        setUser(userData);
        localStorage.setItem("rm_auth", "true");
        localStorage.setItem("rm_user", JSON.stringify(userData));
        return true;
      }
      return false;
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
  }, [useSupabase]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, authUserId, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
