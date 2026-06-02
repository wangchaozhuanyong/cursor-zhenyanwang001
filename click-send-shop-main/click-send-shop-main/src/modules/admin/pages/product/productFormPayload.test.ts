import { describe, expect, it } from "vitest";
import type { ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";
import { buildAdminProductUpsertPayload } from "@/modules/admin/pages/product/productFormPayload";

const baseForm = {
  name: "  Test product  ",
  price: "12.50",
  original_price: "15.00",
  cost_price: "6.25",
  sales_count: "8",
  stock: "20",
  stock_warning_threshold: "4",
  stock_lower_limit: "2",
  stock_upper_limit: "80",
  category_id: "cat-1",
  sort_order: "9",
  description: "Description",
  cover_image: "https://example.com/cover.jpg",
  cover_image_alt: "  Cover alt  ",
  video_url: " https://example.com/video.mp4 ",
  images: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
  image_alts: [" A alt ", ""],
  status: "draft",
  is_hot: true,
  is_new: true,
  is_recommended: false,
  is_age_restricted: false,
  minimum_age: "",
  compliance_type: "normal",
  region_notice: "",
  compliance_notice: "",
  allow_index: true,
  tag_ids: ["tag-1"],
  spec_groups: [],
  variants: [
    {
      title: "",
      sku_code: " SKU-1 ",
      price: "11",
      original_price: "",
      cost_price: "",
      stock: "5",
      stock_warning_threshold: "",
      stock_lower_limit: "",
      stock_upper_limit: "",
      barcode: " BAR-1 ",
      image_url: " https://example.com/sku.jpg ",
      weight: "1.5",
      enabled: true,
      sort_order: 0,
      is_default: true,
      spec_value_ids: [],
    },
  ],
} satisfies ProductFormPayloadSlice;

describe("buildAdminProductUpsertPayload", () => {
  it("builds a create payload from a single default SKU form", () => {
    const payload = buildAdminProductUpsertPayload(baseForm, { includeStock: true });

    expect(payload.name).toBe("Test product");
    expect(payload.price).toBe(12.5);
    expect(payload.stock).toBe(20);
    expect(payload.original_price).toBe(15);
    expect(payload.cover_image_alt).toBe("Cover alt");
    expect(payload.video_url).toBe("https://example.com/video.mp4");
    expect(payload.image_alts).toEqual(["A alt", ""]);
    expect(payload.isNewArrival).toBe(true);
    expect(payload.variants?.[0]).toMatchObject({
      title: "默认规格",
      sku_code: "SKU-1",
      price: 12.5,
      original_price: 15,
      cost_price: 6.25,
      stock: 20,
      stock_warning_threshold: 4,
      stock_lower_limit: 2,
      stock_upper_limit: 80,
      barcode: "BAR-1",
      image_url: "https://example.com/sku.jpg",
      weight: 1.5,
      enabled: true,
      is_default: true,
    });
  });

  it("发布时强制启用状态，并禁止受监管商品被索引", () => {
    const payload = buildAdminProductUpsertPayload(
      {
        ...baseForm,
        allow_index: true,
        is_age_restricted: true,
        minimum_age: "18",
        compliance_type: "adult",
        region_notice: "  MY only  ",
        compliance_notice: "  Restricted  ",
      },
      { publish: true },
    );

    expect(payload.status).toBe("active");
    expect(payload.allow_index).toBe(false);
    expect(payload.minimum_age).toBe(18);
    expect(payload.compliance_type).toBe("adult");
    expect(payload.region_notice).toBe("MY only");
    expect(payload.compliance_notice).toBe("Restricted");
    expect(payload.stock).toBeUndefined();
  });
});
