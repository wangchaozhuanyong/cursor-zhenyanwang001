import { describe, expect, it } from "vitest";
import type { ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";
import { buildMatrixModeProductForm, buildRegeneratedProductSkuMatrix } from "@/modules/admin/pages/product/productSkuMatrix";
import { DEFAULT_VARIANT_TITLE, MAX_SKU_MATRIX_SIZE } from "@/utils/productFormVariantUtils";

const baseForm = {
  name: "Product",
  price: "12.50",
  original_price: "",
  cost_price: "",
  sales_count: "",
  stock: "9",
  stock_warning_threshold: "3",
  stock_lower_limit: "1",
  stock_upper_limit: "20",
  category_id: "",
  sort_order: "",
  description: "",
  cover_image: "",
  cover_image_alt: "",
  video_url: "",
  images: [],
  image_alts: [],
  status: "active",
  is_hot: false,
  is_new: false,
  is_recommended: false,
  is_age_restricted: false,
  minimum_age: "",
  compliance_type: "normal",
  region_notice: "",
  compliance_notice: "",
  allow_index: true,
  tag_ids: [],
  spec_groups: [],
  variants: [
    {
      title: DEFAULT_VARIANT_TITLE,
      sku_code: "SKU-1",
      price: "12.50",
      stock: "9",
      sort_order: 0,
      is_default: true,
      enabled: true,
    },
  ],
} satisfies ProductFormPayloadSlice;

describe("productSkuMatrix", () => {
  it("converts a single default SKU into matrix mode", () => {
    const ids = ["value-1", "group-1"];
    const next = buildMatrixModeProductForm(baseForm, () => ids.shift() || "fallback");

    expect(next.spec_groups).toEqual([
      {
        id: "group-1",
        name: "规格",
        sort_order: 0,
        values: [{ id: "value-1", value: DEFAULT_VARIANT_TITLE, image_url: "", sort_order: 0 }],
      },
    ]);
    expect(next.variants[0]).toMatchObject({
      title: DEFAULT_VARIANT_TITLE,
      spec_value_ids: ["value-1"],
      is_default: true,
      stock_warning_threshold: "3",
      stock_lower_limit: "1",
      stock_upper_limit: "20",
    });
  });

  it("regenerates SKU rows and preserves existing matched variants", () => {
    const form = {
      ...baseForm,
      variants: [
        {
          ...baseForm.variants[0],
          id: "variant-red",
          title: "Red / M",
          sku_code: "RED-M",
          price: "15",
          stock: "6",
          is_default: true,
          spec_value_ids: ["red", "m"],
        },
      ],
    } satisfies ProductFormPayloadSlice;
    const result = buildRegeneratedProductSkuMatrix(form, [
      {
        id: "color",
        name: "Color",
        sort_order: 0,
        values: [
          { id: "red", value: "Red", image_url: "", sort_order: 0 },
          { id: "blue", value: "Blue", image_url: "", sort_order: 1 },
        ],
      },
      {
        id: "size",
        name: "Size",
        sort_order: 1,
        values: [{ id: "m", value: "M", image_url: "", sort_order: 0 }],
      },
    ]);

    expect(result.status).toBe("updated");
    if (result.status !== "updated") return;
    expect(result.form.variants).toHaveLength(2);
    expect(result.form.variants[0]).toMatchObject({
      id: "variant-red",
      title: "Red / M",
      sku_code: "RED-M",
      price: "15",
      stock: "6",
      is_default: true,
      spec_value_ids: ["red", "m"],
    });
    expect(result.form.variants[1]).toMatchObject({
      title: "Blue / M",
      price: "12.50",
      stock: "0",
      is_default: false,
      spec_value_ids: ["blue", "m"],
    });
  });

  it("reports oversized SKU matrices", () => {
    const values = Array.from({ length: MAX_SKU_MATRIX_SIZE + 1 }, (_, index) => ({
      id: `v-${index}`,
      value: `Value ${index}`,
      image_url: "",
      sort_order: index,
    }));
    const result = buildRegeneratedProductSkuMatrix(baseForm, [
      { id: "too-many", name: "Too many", sort_order: 0, values },
    ]);

    expect(result).toEqual({ status: "tooLarge", maxSize: MAX_SKU_MATRIX_SIZE });
  });
});
