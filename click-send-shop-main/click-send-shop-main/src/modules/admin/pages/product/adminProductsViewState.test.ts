import { beforeEach, describe, expect, it } from "vitest";
import {
  ADMIN_PRODUCTS_VIEW_STATE_KEY,
  DEFAULT_ADMIN_PRODUCTS_VIEW_STATE,
  normalizeAdminProductsViewState,
  readAdminProductsViewState,
  readProductMediaFilterFromSearch,
  readProductMediaRepairScopeFromSearch,
  sortProductsByRepairPriority,
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
      mediaFilter: "broken" as never,
      sort: "missing_sort" as never,
    });

    expect(state).toMatchObject({
      page: 1,
      search: "",
      statusFilter: "",
      stockFilter: "",
      costFilter: "",
      mediaFilter: "",
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
        mediaFilter: "missing",
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
      mediaFilter: "missing",
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
      mediaFilter: "normal",
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
      mediaFilter: "normal",
      sort: "price_desc",
    });
  });

  it("accepts only supported media filters from a direct repair link", () => {
    expect(readProductMediaFilterFromSearch("?media_status=missing")).toBe("missing");
    expect(readProductMediaFilterFromSearch("media_status=normal")).toBe("normal");
    expect(readProductMediaFilterFromSearch("?media_status=unknown")).toBe("");
  });

  it("accepts only the home repair scope from a direct release-readiness link", () => {
    expect(readProductMediaRepairScopeFromSearch("?media_status=missing&repair_scope=home")).toBe("home");
    expect(readProductMediaRepairScopeFromSearch("?repair_scope=all")).toBe("");
  });

  it("sorts missing products by storefront repair priority without dropping unknown rows", () => {
    const products = [
      { id: "product-c", name: "C" },
      { id: "product-a", name: "A" },
      { id: "product-extra", name: "Extra" },
      { id: "product-b", name: "B" },
    ];

    expect(sortProductsByRepairPriority(products, ["product-a", "product-b", "product-c"]))
      .toEqual([
        { id: "product-a", name: "A" },
        { id: "product-b", name: "B" },
        { id: "product-c", name: "C" },
        { id: "product-extra", name: "Extra" },
      ]);
    expect(products[0].id).toBe("product-c");
  });
});
