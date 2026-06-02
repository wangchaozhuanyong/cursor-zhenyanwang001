import { describe, expect, it } from "vitest";
import type { Product } from "@/types/product";
import { DEFAULT_VARIANT_TITLE } from "@/utils/productFormVariantUtils";
import { buildProductFormFromProduct } from "@/modules/admin/pages/product/productFormHydration";

const baseProduct = {
  id: "product-1",
  name: "Product",
  cover_image: "https://example.com/cover.jpg",
  images: [],
  price: 12.5,
  points: 0,
  category_id: "cat-1",
  stock: 20,
  status: "active",
  sort_order: 7,
  description: "Description",
  is_recommended: false,
  is_new: false,
  is_hot: false,
} satisfies Product;

describe("buildProductFormFromProduct", () => {
  it("hydrates product edit API data into a stable admin form shape", () => {
    const product = {
      ...baseProduct,
      name: "Loaded product",
      cover_image_alt: "Cover alt",
      video_url: "https://example.com/video.mp4",
      images: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
      image_alts: ["A alt"],
      original_price: 15,
      sales_count: 8,
      stock_warning_threshold: 4,
      stock_lower_limit: 2,
      stock_upper_limit: 80,
      status: "inactive",
      is_recommended: true,
      is_new: true,
      is_hot: true,
      is_age_restricted: true,
      minimum_age: 18,
      compliance_type: "regulated",
      region_notice: "MY only",
      compliance_notice: "Restricted",
      allow_index: 0,
      tags: [{ id: "tag-1", name: "Featured", sort_order: 1 }],
      spec_groups: [
        {
          id: "group-1",
          name: "Color",
          sort_order: 0,
          values: [
            { id: "red", group_id: "group-1", value: "Red", image_url: "https://example.com/red.jpg", sort_order: 0 },
          ],
        },
      ],
      variants: [
        {
          id: "variant-1",
          title: "",
          sku_code: " SKU-1 ",
          price: 11,
          original_price: 13,
          cost_price: 6.25,
          stock: 5,
          stock_warning_threshold: 1,
          stock_lower_limit: 0,
          stock_upper_limit: 10,
          barcode: "BAR-1",
          image_url: "https://example.com/sku.jpg",
          weight: 1.5,
          enabled: false,
          sort_order: 3,
          is_default: true,
          spec_value_ids: ["red"],
        },
      ],
    } satisfies Product;

    const form = buildProductFormFromProduct(product);

    expect(form).toMatchObject({
      name: "Loaded product",
      price: "12.5",
      original_price: "15",
      cost_price: "6.25",
      sales_count: "8",
      stock: "20",
      stock_warning_threshold: "4",
      stock_lower_limit: "2",
      stock_upper_limit: "80",
      category_id: "cat-1",
      sort_order: "7",
      description: "Description",
      cover_image: "https://example.com/cover.jpg",
      cover_image_alt: "Cover alt",
      video_url: "https://example.com/video.mp4",
      images: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
      image_alts: ["A alt", ""],
      status: "inactive",
      is_hot: true,
      is_new: true,
      is_recommended: true,
      is_age_restricted: true,
      minimum_age: "18",
      compliance_type: "regulated",
      region_notice: "MY only",
      compliance_notice: "Restricted",
      allow_index: false,
      tag_ids: ["tag-1"],
    });
    expect(form.spec_groups).toEqual([
      {
        id: "group-1",
        name: "Color",
        sort_order: 0,
        values: [{ id: "red", value: "Red", image_url: "https://example.com/red.jpg", sort_order: 0 }],
      },
    ]);
    expect(form.variants[0]).toMatchObject({
      id: "variant-1",
      title: DEFAULT_VARIANT_TITLE,
      sku_code: " SKU-1 ",
      price: "11",
      original_price: "13",
      cost_price: "6.25",
      stock: "5",
      stock_warning_threshold: "1",
      stock_lower_limit: "0",
      stock_upper_limit: "10",
      barcode: "BAR-1",
      image_url: "https://example.com/sku.jpg",
      weight: "1.5",
      enabled: false,
      sort_order: 3,
      is_default: true,
      spec_value_ids: ["red"],
    });
  });

  it("falls back to a single default SKU and product-level safe defaults", () => {
    const product = {
      ...baseProduct,
      status: "archived",
      sales_count: undefined,
      stock_warning_threshold: undefined,
      stock_lower_limit: null,
      stock_upper_limit: null,
      default_variant: {
        id: "default-variant",
        title: DEFAULT_VARIANT_TITLE,
        price: 12.5,
        stock: 20,
        stock_warning_threshold: 5,
        stock_lower_limit: 1,
        stock_upper_limit: 30,
        sort_order: 0,
        is_default: true,
      },
      variants: [],
    } satisfies Product;

    const form = buildProductFormFromProduct(product);

    expect(form.status).toBe("active");
    expect(form.sales_count).toBe("0");
    expect(form.allow_index).toBe(true);
    expect(form.images).toEqual([]);
    expect(form.image_alts).toEqual([]);
    expect(form.stock_warning_threshold).toBe("5");
    expect(form.stock_lower_limit).toBe("1");
    expect(form.stock_upper_limit).toBe("30");
    expect(form.variants).toEqual([
      expect.objectContaining({
        title: DEFAULT_VARIANT_TITLE,
        sku_code: "",
        price: "12.5",
        stock: "20",
        stock_warning_threshold: "5",
        stock_lower_limit: "1",
        stock_upper_limit: "30",
        sort_order: 0,
        is_default: true,
        enabled: true,
      }),
    ]);
  });
});
