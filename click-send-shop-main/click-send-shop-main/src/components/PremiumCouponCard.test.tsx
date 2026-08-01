import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import PremiumCouponCard from "./PremiumCouponCard";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("PremiumCouponCard fixed design", () => {
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

  function renderCard(props: Partial<ComponentProps<typeof PremiumCouponCard>> = {}) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <PremiumCouponCard
          title="会员满减券"
          amount="RM 20"
          minSpendText="满 RM 100 可用"
          expireText="2026-08-31 到期"
          {...props}
        />,
      );
    });
    return container;
  }

  it("renders a compact three-column coupon row without nested buttons", () => {
    const onClick = vi.fn();
    const onAction = vi.fn();
    const view = renderCard({
      layout: "compact",
      selected: true,
      actionLabel: "使用",
      onClick,
      onAction,
    });

    const card = view.querySelector(".sf-next-coupon-card");
    expect(card).toHaveAttribute("data-coupon-card-layout", "compact");
    expect(card).toHaveClass("is-selected");
    expect(card).toHaveAttribute("role", "button");
    expect(card?.querySelectorAll("button")).toHaveLength(1);
    expect(card?.querySelector("button button")).not.toBeInTheDocument();
    expect(view.textContent).toContain("RM");
    expect(view.textContent).toContain("满 RM 100 可用");

    act(() => {
      card?.querySelector<HTMLButtonElement>("button")?.click();
    });
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("supports keyboard selection and blocks disabled coupon actions", () => {
    const onClick = vi.fn();
    const interactiveView = renderCard({ onClick });
    const card = interactiveView.querySelector<HTMLElement>(".sf-next-coupon-card");

    act(() => {
      card?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(onClick).toHaveBeenCalledTimes(1);

    act(() => {
      root?.render(
        <PremiumCouponCard
          title="已失效优惠券"
          amount="10%"
          expireText="已过期"
          disabled
          actionLabel="不可用"
          onClick={onClick}
        />,
      );
    });

    const disabledCard = container?.querySelector(".sf-next-coupon-card");
    expect(disabledCard).toHaveClass("is-disabled");
    expect(disabledCard).not.toHaveAttribute("role");
    expect(disabledCard?.querySelector("button")).toBeDisabled();
  });
});
