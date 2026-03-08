import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const devProxySupabaseUrl =
  import.meta.env.DEV && typeof window !== "undefined" ? `${window.location.origin}/supabase` : undefined;
const supabaseUrl = devProxySupabaseUrl || rawSupabaseUrl;

export const isSupabaseConfigured = Boolean(rawSupabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
