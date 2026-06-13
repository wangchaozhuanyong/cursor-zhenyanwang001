import { describe, expect, it } from "vitest";
import { buildProductCardV2Model } from "./productCardV2Model";
import type { Product } from "@/types/product";

function product(partial: Partial<Product>): Product {
  return {
    id: "p1",
    name: "测试商品",
    cover_image: "/x.jpg",
    images: [],
    price: 12,
    points: 0,
    category_id: "c1",
    stock: 9,
    status: "active",
    sort_order: 0,
    description: "",
    is_recommended: false,
    is_new: false,
    is_hot: false,
    ...partial,
  };
}

describe("buildProductCardV2Model", () => {
  it("limits badges to two entries", () => {
    const vm = buildProductCardV2Model(product({
      active_activity: {
        id: "a1",
        type: "flash_sale",
        title: "秒杀",
        start_at: "",
        end_at: "",
        activity_price: 8,
        limit_per_user: 1,
        activity_stock: 10,
        sold_count: 1,
        remaining_stock: 9,
        status: "active",
        status_label: "进行中",
      },
      is_hot: true,
      is_new: true,
    }));

    expect(vm.badges.map((badge) => badge.label)).toEqual(["秒杀", "热销"]);
  });

  it("formats range and original price", () => {
    const vm = buildProductCardV2Model(product({
      price: 10,
      min_price: 10,
      max_price: 18,
      original_price: 30,
    } as Partial<Product>));

    expect(vm.priceText).toBe("10-18");
    expect(vm.originalPriceText).toBe("30");
  });

  it("marks sold out from default variant stock", () => {
    const vm = buildProductCardV2Model(product({
      stock: 9,
      default_variant: {
        id: "v1",
        title: "默认",
        price: 12,
        stock: 0,
        sort_order: 0,
        is_default: true,
      },
    }));

    expect(vm.soldOut).toBe(true);
  });
});
