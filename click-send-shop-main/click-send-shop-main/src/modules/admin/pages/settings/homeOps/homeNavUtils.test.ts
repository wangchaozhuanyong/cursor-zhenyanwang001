import { describe, expect, it } from "vitest";
import type { HomeNavItem } from "@/types/content";
import {
  flattenCategories,
  getHomeNavValidationIssue,
  getHomeNavRepairSuggestion,
  isUsableHomeNavUrlTarget,
  readHomeNavRepairScopeFromSearch,
} from "./homeNavUtils";

const baseItem: HomeNavItem = {
  id: "nav-1",
  icon_url: "",
  title: "入口",
  link_url: "",
  sort_order: 1,
  enabled: true,
};

const validationOptions = {
  publicCategoryIds: new Set(["cat-visible"]),
  enabledSupportChannelIds: new Set(["support-enabled"]),
  supportNavEnabled: true,
};

describe("home navigation target validation", () => {
  it("只接受失效入口专用修复范围", () => {
    expect(readHomeNavRepairScopeFromSearch("?tab=nav&repair_scope=invalid")).toBe("invalid");
    expect(readHomeNavRepairScopeFromSearch("?tab=nav&repair_scope=all")).toBe("");
    expect(readHomeNavRepairScopeFromSearch("?tab=nav")).toBe("");
  });

  it("accepts internal paths and HTTP(S) URLs only", () => {
    expect(isUsableHomeNavUrlTarget("/invite")).toBe(true);
    expect(isUsableHomeNavUrlTarget("categories")).toBe(true);
    expect(isUsableHomeNavUrlTarget("https://example.com")).toBe(true);
    expect(isUsableHomeNavUrlTarget("")).toBe(false);
    expect(isUsableHomeNavUrlTarget("//example.com")).toBe(false);
    expect(isUsableHomeNavUrlTarget("javascript:alert(1)")).toBe(false);
  });

  it("reports stale category and support targets", () => {
    expect(getHomeNavValidationIssue({
      ...baseItem,
      target_type: "category",
      target_category_id: "cat-stale",
    }, validationOptions)).toBe("目标分类不存在、已停用或不可见");

    expect(getHomeNavValidationIssue({
      ...baseItem,
      target_type: "support",
      target_support_channel_id: "support-stale",
    }, validationOptions)).toBe("客服账号不存在或已禁用");
  });

  it("keeps only active visible categories in the selector", () => {
    expect(flattenCategories([
      {
        id: "visible",
        name: "有效分类",
        is_active: true,
        is_visible: true,
        children: [{ id: "child", name: "有效子分类" }],
      },
      {
        id: "hidden",
        name: "隐藏分类",
        is_active: true,
        is_visible: false,
      },
      {
        id: "disabled",
        name: "停用分类",
        is_active: false,
        is_visible: true,
      },
    ])).toEqual([
      { id: "visible", label: "有效分类" },
      { id: "child", label: "-- 有效子分类" },
    ]);
  });

  it("builds explicit repairs for the current invalid production shortcuts", () => {
    const categories = [
      { id: "tobacco", name: "正品烟草", is_active: true, is_visible: true },
      { id: "visa", name: "签证服务", is_active: true, is_visible: true },
      { id: "second-home", name: "第二家园", is_active: true, is_visible: true },
      { id: "study", name: "留学办理", is_active: true, is_visible: true },
    ];

    const tobacco = getHomeNavRepairSuggestion({
      ...baseItem,
      title: "正品烟草",
      target_type: "category",
      target_category_id: "stale",
    }, categories, "目标分类不存在");
    expect(tobacco?.payload).toMatchObject({
      target_type: "category",
      target_category_id: "tobacco",
      link_url: "/categories?cat=tobacco",
      enabled: true,
    });

    const visa = getHomeNavRepairSuggestion({
      ...baseItem,
      title: "签证办理",
      target_type: "category",
      target_category_id: "stale",
    }, categories, "目标分类不存在");
    expect(visa?.payload.target_category_id).toBe("visa");

    const bedding = getHomeNavRepairSuggestion({
      ...baseItem,
      title: "床上用品",
      target_type: "url",
      link_url: "",
    }, categories, "跳转地址为空");
    expect(bedding?.payload).toEqual({ enabled: false });
  });

  it("keeps external invitation repair as an explicit owner-confirmed internal route change", () => {
    const suggestion = getHomeNavRepairSuggestion({
      ...baseItem,
      title: "邀请返现",
      target_type: "url",
      link_url: "https://flashcast.com.my/invite",
    }, [], null);

    expect(suggestion?.payload).toMatchObject({
      target_type: "url",
      link_url: "/invite",
      enabled: true,
    });
  });
});
