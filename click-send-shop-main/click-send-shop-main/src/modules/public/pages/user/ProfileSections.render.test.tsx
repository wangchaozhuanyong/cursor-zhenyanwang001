import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { CircleHelp, Gift, Headphones, Settings, Star, Ticket, Wallet } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ProfileAssetPanel,
  ProfileHeroCard,
  ProfileSecondaryLinkPanel,
  ProfileServiceGrid,
  type ProfileAssetItem,
  type ProfileServiceItem,
} from "./ProfileSections";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("ProfileAssetPanel", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  const assetItems: ProfileAssetItem[] = [
    { key: "points", label: "积分", value: "120", icon: Star, path: "/points", auth: true },
    { key: "coupons", label: "优惠券", value: "3", icon: Ticket, path: "/coupons", auth: true },
    { key: "balance", label: "余额", value: "RM 8.00", icon: Wallet, path: "/profile", auth: true },
    { key: "rewards", label: "奖励", value: "2", icon: Gift, path: "/rewards", auth: true },
  ];
  const serviceItems: ProfileServiceItem[] = [
    { key: "address", label: "收货地址", icon: Star, path: "/address", auth: true },
    { key: "favorites", label: "我的收藏", icon: Gift, path: "/favorites", auth: false },
    { key: "support", label: "客服中心", icon: Headphones, path: "/support-download?tab=support", auth: false },
  ];
  const secondaryItems: ProfileServiceItem[] = [
    { key: "help", label: "帮助中心", icon: CircleHelp, path: "/help", auth: false },
    { key: "settings", label: "账户设置", icon: Settings, path: "/settings", auth: true },
  ];

  async function renderNode(node: ReactNode) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<>{node}</>);
    });
  }

  async function renderPanel(onNavigate = vi.fn()) {
    await renderNode(<ProfileAssetPanel items={assetItems} onNavigate={onNavigate} />);
    return onNavigate;
  }

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container?.remove();
    container = null;
    root = null;
    vi.clearAllMocks();
  });

  it("uses the storefront next asset grid without inline column overrides", async () => {
    await renderPanel();

    const panel = container?.querySelector(".sf-next-profile-asset-panel");
    const grid = container?.querySelector<HTMLElement>(".profile-asset-grid");
    const actions = container?.querySelectorAll(".profile-asset-action");

    expect(panel).not.toBeNull();
    expect(grid).not.toBeNull();
    expect(grid?.getAttribute("style") || "").not.toContain("grid-template-columns");
    expect(actions).toHaveLength(4);
    expect(container?.textContent).toContain("我的资产");
    expect(container?.textContent).toContain("RM 8.00");
  });

  it("keeps asset navigation wired to the original item payload", async () => {
    const onNavigate = await renderPanel();
    const buttons = Array.from(container?.querySelectorAll<HTMLButtonElement>(".profile-asset-action") ?? []);

    await act(async () => {
      buttons[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onNavigate).toHaveBeenCalledWith(assetItems[1]);
  });

  it("keeps shopping service actions wired to their original item payloads", async () => {
    const onNavigate = vi.fn();
    await renderNode(<ProfileServiceGrid items={serviceItems} onNavigate={onNavigate} />);

    const buttons = Array.from(container?.querySelectorAll<HTMLButtonElement>(".profile-service-action") ?? []);

    await act(async () => {
      buttons[2]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(buttons.map((button) => button.dataset.featureKey)).toEqual(["address", "favorites", "support"]);
    expect(onNavigate).toHaveBeenCalledWith(serviceItems[2]);
  });

  it("keeps secondary actions and support shortcut clickable", async () => {
    const onNavigate = vi.fn();
    const onSupportClick = vi.fn();
    await renderNode(
      <ProfileSecondaryLinkPanel
        items={secondaryItems}
        onNavigate={onNavigate}
        onSupportClick={onSupportClick}
      />,
    );

    const buttons = Array.from(container?.querySelectorAll<HTMLButtonElement>(".profile-secondary-action") ?? []);
    const supportButton = container?.querySelector<HTMLButtonElement>(".profile-section-more");

    await act(async () => {
      buttons[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      supportButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(buttons.map((button) => button.dataset.featureKey)).toEqual(["help", "settings"]);
    expect(onNavigate).toHaveBeenCalledWith(secondaryItems[1]);
    expect(onSupportClick).toHaveBeenCalledTimes(1);
  });

  it("keeps the curated member hero stable with long account data", async () => {
    const onAssetNavigate = vi.fn();
    const heroAssets: ProfileAssetItem[] = [
      { key: "coupons", label: "我的优惠券", value: "99999", icon: Ticket, path: "/coupons", auth: true },
      { key: "points", label: "可用积分", value: "1234567890", icon: Star, path: "/points", auth: true },
      { key: "wallet", label: "返现余额", value: "RM 1234567.89", icon: Wallet, path: "/wallet", auth: true },
      { key: "extra", label: "额外资产", value: "4", icon: Gift, path: "/profile", auth: true },
    ];

    await renderNode(
      <ProfileHeroCard
        logoSrc="/logo.png"
        userName="  超长用户昵称展示页  "
        memberLevelName="至尊精选商城长期会员"
        assets={heroAssets}
        unreadCount={199}
        onMessageClick={vi.fn()}
        onMemberLevelClick={vi.fn()}
        onProfileClick={vi.fn()}
        onViewAllBenefits={vi.fn()}
        onAssetNavigate={onAssetNavigate}
        onAvatarClick={vi.fn()}
        variant="curated"
      />,
    );

    const hero = container?.querySelector(".curated-life-profile-hero-card");
    const assets = Array.from(container?.querySelectorAll<HTMLButtonElement>(".profile-card-asset") ?? []);

    expect(hero?.getAttribute("aria-label")).toBe("至尊精选商城长期会员权益");
    expect(container?.querySelector(".profile-vip-name")?.textContent).toBe("超长用户昵称展…");
    expect(container?.querySelector(".profile-vip-badge")?.textContent).toBe("至尊精选商城长期会员");
    expect(container?.textContent).not.toContain("权益以当前会员配置为准");
    expect(assets).toHaveLength(3);
    expect(assets[2]?.getAttribute("aria-label")).toBe("返现余额：RM 1234567.89");

    await act(async () => {
      assets[2]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onAssetNavigate).toHaveBeenCalledWith(heroAssets[2]);
  });
});
