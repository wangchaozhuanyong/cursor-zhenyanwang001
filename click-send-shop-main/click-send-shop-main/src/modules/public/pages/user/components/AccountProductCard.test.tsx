import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { PublicLocaleProvider } from "@/i18n/PublicLocaleProvider";
import type { Product } from "@/types/product";
import AccountProductCard from "./AccountProductCard";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function product(partial: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "高级测试商品",
    cover_image: "/x.jpg",
    images: [],
    price: 12,
    points: 0,
    category_id: "c1",
    stock: 8,
    status: "active",
    sort_order: 0,
    description: "",
    is_recommended: false,
    is_new: false,
    is_hot: false,
    ...partial,
  };
}

describe("AccountProductCard", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  async function renderCard(item: Product) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <PublicLocaleProvider>
            <AccountProductCard product={item} />
          </PublicLocaleProvider>
        </MemoryRouter>,
      );
    });
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
  });

  it("shows backend activity price, original price, badge, and stock progress", async () => {
    await renderCard(product({
      active_activity: {
        id: "a1",
        type: "flash_sale",
        title: "限时秒杀",
        start_at: "",
        end_at: "",
        activity_price: 8,
        limit_per_user: 1,
        activity_stock: 10,
        sold_count: 6,
        remaining_stock: 4,
        status: "active",
        status_label: "进行中",
      },
    }));

    const text = container?.textContent || "";
    expect(text).toContain("高级测试商品");
    expect(text).toContain("秒杀");
    expect(text).toContain("8");
    expect(text).toContain("RM 12");
    expect(text).toContain("秒杀剩余 4");
    expect(text).toContain("剩 4 · 限购 1");
  });
});
