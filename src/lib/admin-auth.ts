import { supabase } from "@/lib/supabase";

export type AdminProvisionResult = {
  id: string;
  name: string;
  email: string;
  propertyName: string;
  status: "Active" | "Pending" | "Suspended";
  authUserId: string | null;
  mustResetPassword: boolean;
};

type ValidateAdminAccessResult = {
  authorized: boolean;
  reason?: string;
  mustResetPassword?: boolean;
};

const configuredFunctionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
const proxiedFunctionsUrl =
  import.meta.env.DEV && typeof window !== "undefined" ? `${window.location.origin}/supabase/functions/v1` : undefined;
const inferredFunctionsUrl =
  import.meta.env.VITE_SUPABASE_URL && typeof import.meta.env.VITE_SUPABASE_URL === "string"
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
    : undefined;

const functionsBaseUrl = configuredFunctionsUrl || proxiedFunctionsUrl || inferredFunctionsUrl;

const getHeaders = async () => {
  if (!supabase) {
    return { "Content-Type": "application/json" };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
};

const callFunction = async <T>(name: string, payload?: unknown): Promise<T> => {
  if (!functionsBaseUrl) {
    throw new Error("Supabase functions URL is not configured.");
  }

  const response = await fetch(`${functionsBaseUrl}/${name}`, {
    method: "POST",
    headers: await getHeaders(),
    body: payload ? JSON.stringify(payload) : JSON.stringify({}),
  });

  const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string } & T;
  if (!response.ok) {
    throw new Error(body.error || body.message || `Request failed (HTTP ${response.status}).`);
  }

  return body as T;
};

export const provisionAdminUser = async (payload: {
  name: string;
  email: string;
  propertyName: string;
  status: "Active" | "Pending" | "Suspended";
  tempPassword: string;
}) => {
  return callFunction<{ admin: AdminProvisionResult }>("provision-admin-user", payload);
};

export const validateAdminAccess = async () => {
  return callFunction<ValidateAdminAccessResult>("validate-admin-access");
};

export const completeAdminPasswordReset = async () => {
  return callFunction<{ success: true }>("complete-admin-password-reset");
};

export const resetAdminPassword = async (payload: { adminId: string; tempPassword: string }) => {
  return callFunction<{ success: true }>("reset-admin-password", payload);
};
