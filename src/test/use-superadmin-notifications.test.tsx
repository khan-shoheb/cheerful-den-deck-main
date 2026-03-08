import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as React from "react";

vi.mock("@/hooks/use-app-state", () => ({
  useAppState: <T,>(_: string, initial: T) => React.useState<T>(initial),
}));

vi.mock("@/lib/hotel-api", () => ({
  canUseBackend: () => false,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: null,
}));

import { useSuperAdminNotifications } from "@/hooks/use-superadmin-notifications";

describe("useSuperAdminNotifications", () => {
  it("adds a notification to the top of the list", () => {
    const { result } = renderHook(() => useSuperAdminNotifications());

    act(() => {
      result.current.pushNotification({
        title: "Role Matrix Updated",
        message: "admin access enabled for Rooms.",
        module: "superadmin-role-matrix",
        severity: "info",
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].title).toBe("Role Matrix Updated");
    expect(result.current.notifications[0].module).toBe("superadmin-role-matrix");
  });

  it("suppresses duplicate notifications inside dedupe window", () => {
    const { result } = renderHook(() => useSuperAdminNotifications());

    const payload = {
      title: "Role Matrix Updated",
      message: "admin access enabled for Rooms.",
      module: "superadmin-role-matrix",
      severity: "info" as const,
    };

    act(() => {
      result.current.pushNotification(payload);
      result.current.pushNotification(payload);
      result.current.pushNotification(payload);
    });

    expect(result.current.notifications).toHaveLength(1);
  });
});
