import { describe, expect, it, beforeEach } from "vitest";
import { useAdminWorkTabsStore } from "./useAdminWorkTabsStore";

describe("useAdminWorkTabsStore", () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAdminWorkTabsStore.setState({ tabs: [], activeTabId: null });
  });

  it("opens and activates tabs by path", () => {
    const { upsertTab } = useAdminWorkTabsStore.getState();
    upsertTab("/admin/products", "", "商品管理");
    upsertTab("/admin/categories", "", "分类管理");
    const state = useAdminWorkTabsStore.getState();
    expect(state.tabs).toHaveLength(2);
    expect(state.activeTabId).toBe("/admin/categories");
  });

  it("closes active tab and returns neighbor path", () => {
    const store = useAdminWorkTabsStore.getState();
    store.upsertTab("/admin/products", "", "商品管理");
    store.upsertTab("/admin/categories", "", "分类管理");
    const path = store.closeTab("/admin/categories");
    expect(path).toBe("/admin/products");
    expect(useAdminWorkTabsStore.getState().tabs).toHaveLength(1);
  });
});
