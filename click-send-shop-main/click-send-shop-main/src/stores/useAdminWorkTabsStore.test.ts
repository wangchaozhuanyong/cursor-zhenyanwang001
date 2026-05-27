import { describe, expect, it, beforeEach } from "vitest";
import { ADMIN_WORK_TABS_MAX, adminTabPathKey } from "@/config/adminWorkTab";
import { useAdminWorkTabsStore } from "./useAdminWorkTabsStore";

describe("useAdminWorkTabsStore", () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAdminWorkTabsStore.setState({ tabs: [], activeTabId: null, lastLimitNoticeAt: null });
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

  it("reuses the same tab when only query changes", () => {
    const store = useAdminWorkTabsStore.getState();
    store.upsertTab("/admin/reports/daily", "?range=last_7_days", "销售日报");
    store.upsertTab("/admin/reports/daily", "?range=this_month&granularity=day", "销售日报");

    const state = useAdminWorkTabsStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.activeTabId).toBe("/admin/reports/daily");
    expect(state.tabs[0]).toMatchObject({
      id: "/admin/reports/daily",
      path: "/admin/reports/daily?range=this_month&granularity=day",
      title: "销售日报",
    });
  });

  it("keeps activity create type as different tabs", () => {
    const store = useAdminWorkTabsStore.getState();
    store.upsertTab("/admin/marketing/activities/new", "?type=flash_sale", "新建秒杀");
    store.upsertTab("/admin/marketing/activities/new", "?type=full_reduction", "新建满减");

    const state = useAdminWorkTabsStore.getState();
    expect(state.tabs).toHaveLength(2);
    expect(state.tabs.map((t) => t.id)).toEqual([
      "/admin/marketing/activities/new?type=flash_sale",
      "/admin/marketing/activities/new?type=full_reduction",
    ]);
    expect(adminTabPathKey("/admin/marketing/activities/new?type=flash_sale&unused=1")).toBe("/admin/marketing/activities/new?type=flash_sale");
  });

  it("blocks new tabs when reaching limit", () => {
    const store = useAdminWorkTabsStore.getState();
    for (let i = 0; i < ADMIN_WORK_TABS_MAX; i += 1) {
      const result = store.upsertTab(`/admin/test-${i}`, "", `页面 ${i}`);
      expect(result.ok).toBe(true);
    }

    const result = useAdminWorkTabsStore.getState().upsertTab("/admin/overflow", "", "超出页面");
    const state = useAdminWorkTabsStore.getState();
    expect(result).toMatchObject({ ok: false, reason: "limit", max: ADMIN_WORK_TABS_MAX });
    expect(state.tabs).toHaveLength(ADMIN_WORK_TABS_MAX);
    expect(state.tabs.some((tab) => tab.id === "/admin/overflow")).toBe(false);
    expect(state.lastLimitNoticeAt).toEqual(expect.any(Number));
  });

  it("updates tab title without changing tab order", () => {
    const store = useAdminWorkTabsStore.getState();
    store.upsertTab("/admin/marketing/activities/1/edit", "", "编辑活动 #1");
    store.updateTabTitle("/admin/marketing/activities/1/edit", "", "编辑活动：双11秒杀");

    const tab = useAdminWorkTabsStore.getState().tabs[0];
    expect(tab.title).toBe("编辑活动：双11秒杀");
    expect(tab.id).toBe("/admin/marketing/activities/1/edit");
  });
});
