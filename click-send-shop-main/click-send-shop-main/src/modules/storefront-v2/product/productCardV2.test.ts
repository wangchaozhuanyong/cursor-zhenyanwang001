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
    expect(vm.priceText).toBe("8");
    expect(vm.originalPriceText).toBe("12");
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

  it("builds compact decision texts from sales, variants, and activity", () => {
    const vm = buildProductCardV2Model(product({
      sales_count: 1280,
      enabled_sku_count: 3,
      activity_promo_label: "满100减10",
    }));

    expect(vm.salesText).toBe("销量 1.3k+");
    expect(vm.variantText).toBe("3种规格");
    expect(vm.activityText).toBe("满100减10");
    expect(vm.decisionTexts).toEqual(["销量 1.3k+", "3种规格", "满100减10"]);
  });

  it("falls back to recent sales and flash sale inventory hints", () => {
    const vm = buildProductCardV2Model(product({
      sales_qty_30d: 28,
      active_activity: {
        id: "a1",
        type: "flash_sale",
        title: "秒杀",
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

    expect(vm.salesText).toBe("30天售 28");
    expect(vm.activityText).toBe("秒杀剩余 4");
    expect(vm.activityProgressPercent).toBe(60);
    expect(vm.activityProgressText).toBe("剩 4 · 限购 1");
    expect(vm.decisionTexts).toEqual(["30天售 28", "秒杀剩余 4"]);
  });
});
