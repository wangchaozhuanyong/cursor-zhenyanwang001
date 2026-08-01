import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import PaymentMethodPicker, {
  type PaymentMethod,
} from "@/components/PaymentMethodPicker";
import type { CartItem } from "@/types/cart";
import { CheckoutItemsList } from "./components/CheckoutItemsList";

vi.mock("@/components/ProductCoverImage", () => ({
  default: ({ alt, className }: { alt?: string; className?: string }) => (
    <div className={className}>
      <img alt={alt || ""} />
    </div>
  ),
}));

vi.mock("@/components/store/StoreAmountToken", () => ({
  default: ({ amount, className }: { amount: number; className?: string }) => (
    <span className={className}>RM {amount.toFixed(2)}</span>
  ),
}));

vi.mock("@/i18n/publicLocale", () => ({
  usePublicLocale: () => ({
    locale: "zh",
    localizedPath: (path: string) => path,
  }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("fixed checkout design", () => {
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

  const render = (node: ReactNode) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(node);
    });
    return container;
  };

  it("uses compact payment rows and preserves the selected payment state", () => {
    const onChange = vi.fn<(method: PaymentMethod) => void>();
    const view = render(
      <PaymentMethodPicker
        value="reward_wallet"
        onChange={onChange}
        rewardBalance={68.5}
      />,
    );

    const options = view.querySelectorAll(".sf-next-payment-option");
    expect(options).toHaveLength(3);
    expect(options[1]).toHaveClass("is-active");
    expect(view.textContent).toContain("可用 RM 68.50");
    expect(view.querySelector(".rounded-full")).not.toBeInTheDocument();

    const supportButton = Array.from(view.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("联系客服"),
    );
    act(() => {
      supportButton?.click();
    });
    expect(onChange).toHaveBeenCalledWith("whatsapp");
  });

  it("aligns checkout product information in a continuous product row", () => {
    const item: CartItem = {
      product: {
        id: "product-1",
        name: "南洋白咖啡礼盒",
        cover_image: "/coffee.jpg",
        images: [],
        price: 29.9,
        points: 0,
        category_id: "coffee",
        stock: 12,
        status: "active",
        sort_order: 1,
        description: "",
        is_recommended: true,
        is_new: false,
        is_hot: true,
      },
      variant_id: "variant-1",
      variant_name: "榛果风味",
      unit_price: 29.9,
      qty: 2,
    };

    const view = render(<CheckoutItemsList items={[item]} />);

    expect(view.querySelector(".sf-next-checkout-item")).toBeInTheDocument();
    expect(view.querySelector(".sf-next-checkout-media img")).toHaveAttribute(
      "alt",
      "南洋白咖啡礼盒",
    );
    expect(view.textContent).toContain("共 2 件");
    expect(view.textContent).toContain("规格：榛果风味");
    expect(view.textContent).toContain("RM 59.80");
    expect(view.querySelector(".rounded-2xl")).not.toBeInTheDocument();
  });
});
