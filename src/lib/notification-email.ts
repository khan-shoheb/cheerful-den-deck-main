import { supabase } from "@/lib/supabase";

type NotificationEmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
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

export const sendNotificationEmail = async (payload: NotificationEmailPayload) => {
  if (!functionsBaseUrl) return false;
  if (!payload.to.trim()) return false;

  const response = await fetch(`${functionsBaseUrl}/send-notification-email`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify(payload),
  });

  return response.ok;
};
