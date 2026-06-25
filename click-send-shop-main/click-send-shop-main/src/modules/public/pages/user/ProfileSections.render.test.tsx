import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Gift, Star, Ticket, Wallet } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileAssetPanel, type ProfileAssetItem } from "./ProfileSections";

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

  async function renderPanel(onNavigate = vi.fn()) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<ProfileAssetPanel items={assetItems} onNavigate={onNavigate} />);
    });

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
});
