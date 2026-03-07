import { useEffect, useMemo, useRef } from "react";
import { useLocalStorageState } from "@/hooks/use-local-storage";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type AppStateRow = {
  user_id: string;
  key: string;
  value: unknown;
  updated_at: string;
};

export function useAppState<T>(key: string, initialValue: T | (() => T)) {
  const { authUserId, isAuthenticated } = useAuth();

  // Local cache (still useful for fast load/offline)
  const [value, setValue] = useLocalStorageState<T>(key, initialValue);

  const enabled = isSupabaseConfigured && Boolean(supabase) && isAuthenticated && Boolean(authUserId);

  const skipNextUpsertRef = useRef(false);
  const lastSavedJsonRef = useRef<string>("");

  const valueJson = useMemo(() => {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }, [value]);

  // Initial remote load
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase!
        .from("app_state")
        .select("user_id,key,value,updated_at")
        .eq("user_id", authUserId)
        .eq("key", key)
        .maybeSingle<AppStateRow>();

      if (cancelled) return;
      if (error) return;
      if (!data) return;

      skipNextUpsertRef.current = true;
      setValue(data.value as T);
      lastSavedJsonRef.current = JSON.stringify(data.value);
    })();

    return () => {
      cancelled = true;
    };
  }, [authUserId, enabled, key, setValue]);

  // Remote subscription (optional; will no-op if Realtime isn't enabled)
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase!
      .channel(`app_state:${authUserId}:${key}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_state",
          filter: `user_id=eq.${authUserId}`,
        },
        (payload) => {
          const newRow = payload.new as AppStateRow | null;
          if (!newRow || newRow.key !== key) return;
          skipNextUpsertRef.current = true;
          setValue(newRow.value as T);
          lastSavedJsonRef.current = JSON.stringify(newRow.value);
        },
      )
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }, [authUserId, enabled, key, setValue]);

  // Remote save (debounced)
  useEffect(() => {
    if (!enabled) return;

    if (skipNextUpsertRef.current) {
      skipNextUpsertRef.current = false;
      return;
    }

    if (valueJson && valueJson === lastSavedJsonRef.current) return;

    const handle = window.setTimeout(async () => {
      try {
        const { error } = await supabase!
          .from("app_state")
          .upsert({ user_id: authUserId, key, value }, { onConflict: "user_id,key" });
        if (!error) {
          lastSavedJsonRef.current = valueJson;
        }
      } catch {
        // ignore
      }
    }, 300);

    return () => window.clearTimeout(handle);
  }, [authUserId, enabled, key, value, valueJson]);

  return [value, setValue] as const;
}
