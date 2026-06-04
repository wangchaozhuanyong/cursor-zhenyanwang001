import { describe, expect, it } from "vitest";
import { formatProfileHeroName } from "./profileHeroName";
import { buildInstallShortcutItem, buildProfileSecondaryItems, buildShoppingServiceItems } from "./profileQuickLinks";

describe("formatProfileHeroName", () => {
  it("keeps profile hero names within four visible characters", () => {
    expect(formatProfileHeroName("测试")).toBe("测试");
    expect(formatProfileHeroName("超长用户昵称")).toBe("超长用…");
  });

  it("trims surrounding whitespace before limiting the name", () => {
    expect(formatProfileHeroName("  大马通会员  ")).toBe("大马通…");
  });
});

describe("profile quick links", () => {
  it("keeps the shopping service grid focused on high-frequency shopping actions", () => {
    const items = buildShoppingServiceItems(true);

    expect(items.map((item) => item.label)).toEqual(["收货地址", "售后进度", "客服中心", "浏览记录"]);
    expect(items.find((item) => item.label === "售后进度")?.path).toBe("/returns");
    expect(items.some((item) => item.label === "意见反馈")).toBe(false);
    expect(items.some((item) => item.label === "添加桌面")).toBe(false);
  });

  it("uses the support-download page only when the customer service capability is enabled", () => {
    expect(buildShoppingServiceItems(true).find((item) => item.key === "support")?.path).toBe("/support-download?tab=support");
    expect(buildShoppingServiceItems(false).find((item) => item.key === "support")?.path).toBe("/help");
  });

  it("moves feedback, settings, about and notifications into secondary links", () => {
    const items = buildProfileSecondaryItems("9");

    expect(items.map((item) => item.label)).toEqual(["帮助中心", "意见反馈", "关于我们", "账户设置", "消息通知"]);
    expect(items.find((item) => item.key === "feedback")?.path).toBe("/feedback");
    expect(items.find((item) => item.key === "notifications")?.badgeText).toBe("9");
  });

  it("shows the install shortcut only on mobile when the download capability is enabled", () => {
    expect(buildInstallShortcutItem(true, true)?.path).toBe("/support-download?tab=download");
    expect(buildInstallShortcutItem(true, false)).toBeNull();
    expect(buildInstallShortcutItem(false, true)).toBeNull();
  });
});
