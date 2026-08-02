import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OrderPreviewResult } from "@/types/orderPreview";
import { CheckoutLoyaltySection } from "./CheckoutLoyaltySection";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const preview: OrderPreviewResult = {
  goods_amount: 100,
  flash_sale_discount: 0,
  full_reduction_discount: 0,
  coupon_discount: 0,
  discount_amount: 0,
  shipping_fee: 0,
  final_amount: 90,
  total_points: 0,
  available_points: 800,
  max_usable_points: 500,
  points_used: 200,
  points_discount_amount: 2,
  point_value_myr: 0.01,
  redeem_step: 10,
  available_reward_balance: 40,
  max_usable_reward_cash: 25.5,
  reward_cash_discount_amount: 10,
  discount_lines: [],
};

describe("CheckoutLoyaltySection accessibility", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

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

  function renderSection(overrides: Partial<React.ComponentProps<typeof CheckoutLoyaltySection>> = {}) {
    const onPointsToUseChange = vi.fn();
    const onRewardCashAmountChange = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <CheckoutLoyaltySection
          pointsRedeemEnabled
          rewardCashRedeemEnabled
          orderPreview={preview}
          usePoints
          onUsePointsChange={vi.fn()}
          pointsToUse={200}
          onPointsToUseChange={onPointsToUseChange}
          useRewardCash
          onUseRewardCashChange={vi.fn()}
          rewardCashAmount={10}
          onRewardCashAmountChange={onRewardCashAmountChange}
          {...overrides}
        />,
      );
    });
    return { view: container, onPointsToUseChange, onRewardCashAmountChange };
  }

  it("uses an h2 title and concise unique names for every redemption control", () => {
    const { view, onPointsToUseChange, onRewardCashAmountChange } = renderSection();
    const section = view.querySelector("section");
    const heading = view.querySelector("h2");

    expect(heading).toHaveTextContent("积分与返现抵扣");
    expect(section).toHaveAttribute("aria-labelledby", heading?.id);
    expect(view.querySelector('input[type="checkbox"][aria-label="使用积分抵扣"]')).toBeInTheDocument();
    expect(view.querySelector('input[type="checkbox"][aria-label="使用返现余额抵扣"]')).toBeInTheDocument();
    expect(view.querySelector('input[type="range"][aria-label="调整积分使用量"]')).toBeInTheDocument();
    expect(view.querySelector('input[type="number"][aria-label="输入积分使用量"]')).toBeInTheDocument();
    expect(view.querySelector('input[type="range"][aria-label="调整返现抵扣金额"]')).toBeInTheDocument();
    expect(view.querySelector('input[type="number"][aria-label="输入返现抵扣金额"]')).toBeInTheDocument();

    const allPoints = view.querySelector<HTMLButtonElement>('button[aria-label="使用全部可用积分"]');
    const allReward = view.querySelector<HTMLButtonElement>('button[aria-label="使用全部可用返现余额"]');
    act(() => {
      allPoints?.click();
      allReward?.click();
    });
    expect(onPointsToUseChange).toHaveBeenCalledWith(500);
    expect(onRewardCashAmountChange).toHaveBeenCalledWith(25.5);
  });

  it("associates the points disabled reason with its checkbox", () => {
    const disabledPreview = {
      ...preview,
      max_usable_points: 0,
      disabled_reason: "本单金额未达积分抵扣门槛",
    };
    const { view } = renderSection({
      orderPreview: disabledPreview,
      usePoints: false,
    });
    const checkbox = view.querySelector<HTMLInputElement>('input[aria-label="使用积分抵扣"]');
    const describedBy = checkbox?.getAttribute("aria-describedby")?.split(/\s+/) ?? [];
    const description = describedBy
      .map((id) => view.querySelector<HTMLElement>(`[id="${id}"]`)?.textContent ?? "")
      .join(" ");

    expect(checkbox).toBeDisabled();
    expect(description).toContain("本单金额未达积分抵扣门槛");
  });
});
