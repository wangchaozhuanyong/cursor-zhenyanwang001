import { describe, expect, it } from "vitest";
import { DEFAULT_VARIANT_TITLE } from "@/utils/productFormVariantUtils";
import { createEmptyProductForm } from "@/modules/admin/pages/product/productFormInitialState";

describe("createEmptyProductForm", () => {
  it("creates the default new-product form state", () => {
    const form = createEmptyProductForm();

    expect(form).toMatchObject({
      name: "",
      price: "",
      sales_count: "",
      stock: "",
      status: "active",
      is_hot: false,
      is_new: false,
      is_recommended: false,
      allow_index: true,
      images: [],
      image_alts: [],
      tag_ids: [],
      spec_groups: [],
    });
    expect(form.variants).toEqual([
      {
        title: DEFAULT_VARIANT_TITLE,
        sku_code: "",
        price: "",
        stock: "",
        sort_order: 0,
        is_default: true,
      },
    ]);
  });

  it("returns fresh arrays for every form instance", () => {
    const first = createEmptyProductForm();
    const second = createEmptyProductForm();

    first.images.push("https://example.com/one.jpg");
    first.variants[0].sku_code = "SKU-1";

    expect(second.images).toEqual([]);
    expect(second.variants[0].sku_code).toBe("");
  });
});
