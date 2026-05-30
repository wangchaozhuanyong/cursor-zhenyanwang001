import { describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminEventSummary: vi.fn(async (params?: unknown) => ({
    data: {
      unreadCount: 0,
      unresolvedCount: 0,
      p0Count: 0,
      securityCount: 0,
      recoveredCount: 0,
      params,
    },
  })),
}));

vi.mock("@/api/admin/eventCenter", () => ({
  getAdminEventSummary: mocks.getAdminEventSummary,
}));

import { fetchAdminEventSummary } from "./eventCenterService";

describe("fetchAdminEventSummary", () => {
  test("drops React Query context fields before calling the API", async () => {
    await fetchAdminEventSummary({
      queryKey: ["admin", "event-center", "summary"],
      signal: new AbortController().signal,
      client: {},
    } as never);

    expect(mocks.getAdminEventSummary).toHaveBeenCalledWith(undefined);
  });

  test("keeps supported summary filters", async () => {
    await fetchAdminEventSummary({ tab: "pending", severity: "P0", keyword: "订单" });

    expect(mocks.getAdminEventSummary).toHaveBeenLastCalledWith({
      tab: "pending",
      severity: "P0",
      keyword: "订单",
    });
  });
});
