import { describe, expect, it } from "vitest";
import { buildProductDisplayPriceModel } from "./productDisplayPricing";
import type { Product, ProductVariant } from "@/types/product";

function product(partial: Partial<Product>): Product {
  return {
    id: "p1",
    name: "测试商品",
    cover_image: "/x.jpg",
    images: [],
    price: 120,
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

function variant(partial: Partial<ProductVariant>): ProductVariant {
  return {
    id: "v1",
    title: "默认",
    price: 120,
    stock: 9,
    sort_order: 0,
    is_default: true,
    ...partial,
  };
}

describe("buildProductDisplayPriceModel", () => {
  it("uses backend activity price before variant price", () => {
    const vm = buildProductDisplayPriceModel(
      product({
        original_price: 158,
        active_activity: {
          id: "a1",
          type: "flash_sale",
          title: "秒杀",
          start_at: "",
          end_at: "",
          activity_price: 69,
          limit_per_user: 2,
          activity_stock: 50,
          sold_count: 12,
          remaining_stock: 38,
          status: "active",
          status_label: "进行中",
        },
      }),
      variant({ price: 120 }),
    );

    expect(vm.amount).toBe(69);
    expect(vm.displayPrice).toBe(69);
    expect(vm.comparePrice).toBe(69);
    expect(vm.originalPrice).toBe(158);
    expect(vm.hasBackendActivityPrice).toBe(true);
  });

  it("keeps normal variant price when no backend activity price exists", () => {
    const vm = buildProductDisplayPriceModel(
      product({ original_price: 158 }),
      variant({ price: 120, original_price: 150 }),
    );

    expect(vm.amount).toBe(120);
    expect(vm.displayPrice).toBe(120);
    expect(vm.comparePrice).toBe(120);
    expect(vm.originalPrice).toBe(150);
    expect(vm.hasBackendActivityPrice).toBe(false);
  });
});
