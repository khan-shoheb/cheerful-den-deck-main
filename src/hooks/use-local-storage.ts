import { useEffect, useMemo, useState } from "react";

type Serializer<T> = {
  parse: (raw: string) => T;
  stringify: (value: T) => string;
};

const jsonSerializer: Serializer<unknown> = {
  parse: (raw) => JSON.parse(raw) as unknown,
  stringify: (value) => JSON.stringify(value),
};

export function useLocalStorageState<T>(
  key: string,
  initialValue: T | (() => T),
  serializer: Serializer<T> = jsonSerializer as Serializer<T>,
) {
  const eventName = useMemo(() => `local-storage:${key}`, [key]);

  const getInitial = useMemo(() => {
    return () => {
      const resolvedInitial = typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;

      if (typeof window === "undefined") return resolvedInitial;

      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return resolvedInitial;
        return serializer.parse(raw);
      } catch {
        return resolvedInitial;
      }
    };
  }, [initialValue, key, serializer]);

  const [value, setValue] = useState<T>(getInitial);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, serializer.stringify(value));
      window.dispatchEvent(new CustomEvent(eventName, { detail: value }));
    } catch {
      // ignore write errors (quota, privacy mode)
    }
  }, [eventName, key, serializer, value]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.storageArea !== window.localStorage) return;
      if (e.key !== key) return;
      if (e.newValue == null) return;
      try {
        setValue(serializer.parse(e.newValue));
      } catch {
        // ignore parse errors
      }
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<T>;
      setValue(customEvent.detail);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(eventName, handleCustomEvent);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(eventName, handleCustomEvent);
    };
  }, [eventName, key, serializer]);

  return [value, setValue] as const;
}
