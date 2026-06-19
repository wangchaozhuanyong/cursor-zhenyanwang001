import { beforeEach, describe, expect, it } from "vitest";
import {
  ADMIN_ORDERS_VIEW_STATE_KEY,
  DEFAULT_ADMIN_ORDERS_VIEW_STATE,
  normalizeAdminOrdersViewState,
  readAdminOrdersViewState,
  writeAdminOrdersViewState,
} from "./adminOrdersViewState";

describe("adminOrdersViewState", () => {
  beforeEach(() => {
    window.sessionStorage.removeItem(ADMIN_ORDERS_VIEW_STATE_KEY);
  });

  it("normalizes invalid saved filters back to safe defaults", () => {
    const state = normalizeAdminOrdersViewState({
      advancedFiltersOpen: true,
      statusFilter: "unknown" as never,
      paymentFilter: "maybe" as never,
      returnStatus: "lost" as never,
      hasNote: "yes" as never,
      costStatus: "free" as never,
      buyerType: "vip" as never,
      page: -8,
      pageSize: 999,
    });

    expect(state).toMatchObject({
      advancedFiltersOpen: true,
      statusFilter: "",
      paymentFilter: "",
      returnStatus: "",
      hasNote: "",
      costStatus: "",
      buyerType: "",
      page: 1,
      pageSize: DEFAULT_ADMIN_ORDERS_VIEW_STATE.pageSize,
    });
  });

  it("reads saved state and lets a link keyword override the stored search", () => {
    window.sessionStorage.setItem(
      ADMIN_ORDERS_VIEW_STATE_KEY,
      JSON.stringify({
        search: "old order",
        statusFilter: "paid",
        page: 4,
        pageSize: 50,
      }),
    );

    const state = readAdminOrdersViewState({ search: "A1001", page: 1 });

    expect(state.search).toBe("A1001");
    expect(state.statusFilter).toBe("paid");
    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(50);
  });

  it("writes a normalized order list view state to session storage", () => {
    writeAdminOrdersViewState({
      ...DEFAULT_ADMIN_ORDERS_VIEW_STATE,
      advancedFiltersOpen: true,
      paymentFilter: "paid",
      search: "  #A1002  ",
      page: 3,
      pageSize: 100,
    });

    const raw = window.sessionStorage.getItem(ADMIN_ORDERS_VIEW_STATE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw || "{}")).toMatchObject({
      advancedFiltersOpen: true,
      paymentFilter: "paid",
      search: "#A1002",
      page: 3,
      pageSize: 100,
    });
  });
});
