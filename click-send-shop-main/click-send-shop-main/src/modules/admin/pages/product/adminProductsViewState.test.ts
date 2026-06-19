import { beforeEach, describe, expect, it } from "vitest";
import {
  ADMIN_PRODUCTS_VIEW_STATE_KEY,
  DEFAULT_ADMIN_PRODUCTS_VIEW_STATE,
  normalizeAdminProductsViewState,
  readAdminProductsViewState,
  writeAdminProductsViewState,
} from "./adminProductsViewState";

describe("adminProductsViewState", () => {
  beforeEach(() => {
    window.sessionStorage.removeItem(ADMIN_PRODUCTS_VIEW_STATE_KEY);
  });

  it("normalizes invalid saved filters back to safe defaults", () => {
    const state = normalizeAdminProductsViewState({
      page: -8,
      statusFilter: "unknown" as never,
      stockFilter: "empty" as never,
      costFilter: "free" as never,
      sort: "missing_sort" as never,
    });

    expect(state).toMatchObject({
      page: 1,
      search: "",
      statusFilter: "",
      stockFilter: "",
      costFilter: "",
      sort: DEFAULT_ADMIN_PRODUCTS_VIEW_STATE.sort,
    });
  });

  it("reads a saved product list view state from session storage", () => {
    window.sessionStorage.setItem(
      ADMIN_PRODUCTS_VIEW_STATE_KEY,
      JSON.stringify({
        page: "4",
        search: "  marlboro  ",
        statusFilter: "active",
        stockFilter: "low",
        costFilter: "missing",
        sort: "stock_desc",
      }),
    );

    const state = readAdminProductsViewState();

    expect(state).toMatchObject({
      page: 4,
      search: "marlboro",
      statusFilter: "active",
      stockFilter: "low",
      costFilter: "missing",
      sort: "stock_desc",
    });
  });

  it("writes a normalized product list view state to session storage", () => {
    writeAdminProductsViewState({
      ...DEFAULT_ADMIN_PRODUCTS_VIEW_STATE,
      page: 3,
      search: "  iqos  ",
      statusFilter: "inactive",
      stockFilter: "out",
      costFilter: "normal",
      sort: "price_desc",
    });

    const raw = window.sessionStorage.getItem(ADMIN_PRODUCTS_VIEW_STATE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw || "{}")).toMatchObject({
      page: 3,
      search: "iqos",
      statusFilter: "inactive",
      stockFilter: "out",
      costFilter: "normal",
      sort: "price_desc",
    });
  });
});
