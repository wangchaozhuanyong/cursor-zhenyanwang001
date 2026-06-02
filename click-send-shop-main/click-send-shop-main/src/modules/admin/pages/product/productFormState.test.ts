import { describe, expect, it } from "vitest";
import { createEmptyProductForm } from "@/modules/admin/pages/product/productFormInitialState";
import {
  clearProductVideoUrl,
  removeProductGalleryImage,
  removeProductVariantRow,
  selectProductDefaultVariant,
  updateProductDefaultVariantField,
  updateProductGalleryImageAlt,
  updateProductVariantField,
} from "@/modules/admin/pages/product/productFormState";

describe("productFormState", () => {
  it("syncs shared product fields into the default SKU row", () => {
    const form = {
      ...createEmptyProductForm(),
      variants: [
        { ...createEmptyProductForm().variants[0], is_default: false, price: "8" },
        { ...createEmptyProductForm().variants[0], is_default: true, price: "9" },
      ],
    };

    const next = updateProductDefaultVariantField(form, "price", "12.50");

    expect(next.price).toBe("12.50");
    expect(next.variants[0].price).toBe("8");
    expect(next.variants[1].price).toBe("12.50");
    expect(form.price).toBe("");
    expect(form.variants[1].price).toBe("9");
  });

  it("still updates the product-level field if no default SKU row exists", () => {
    const form = { ...createEmptyProductForm(), variants: [] };

    const next = updateProductDefaultVariantField(form, "stock", "3");

    expect(next.stock).toBe("3");
    expect(next.variants).toEqual([]);
  });

  it("syncs default SKU table edits back to product-level fields and the SKU row", () => {
    const form = {
      ...createEmptyProductForm(),
      stock: "5",
      variants: [
        { ...createEmptyProductForm().variants[0], stock: "5", is_default: true },
        { ...createEmptyProductForm().variants[0], stock: "9", is_default: false },
      ],
    };

    const next = updateProductVariantField(form, 0, "stock", "12");

    expect(next.stock).toBe("12");
    expect(next.variants[0].stock).toBe("12");
    expect(next.variants[1].stock).toBe("9");
  });

  it("selects a default SKU and syncs the product-level snapshot fields", () => {
    const form = {
      ...createEmptyProductForm(),
      variants: [
        { ...createEmptyProductForm().variants[0], price: "8", stock: "5", is_default: true },
        { ...createEmptyProductForm().variants[0], price: "12", stock: "9", is_default: false },
      ],
    };

    const next = selectProductDefaultVariant(form, 1);

    expect(next.price).toBe("12");
    expect(next.stock).toBe("9");
    expect(next.variants.map((variant) => variant.is_default)).toEqual([false, true]);
  });

  it("promotes the first remaining SKU when deleting the default row", () => {
    const form = {
      ...createEmptyProductForm(),
      variants: [
        { ...createEmptyProductForm().variants[0], price: "8", stock: "5", is_default: true },
        { ...createEmptyProductForm().variants[0], price: "12", stock: "9", is_default: false },
      ],
    };

    const next = removeProductVariantRow(form, 0);

    expect(next.variants).toHaveLength(1);
    expect(next.variants[0].is_default).toBe(true);
    expect(next.price).toBe("12");
    expect(next.stock).toBe("9");
  });

  it("removes gallery image and alt text at the same index", () => {
    const form = {
      ...createEmptyProductForm(),
      images: ["a.jpg", "b.jpg", "c.jpg"],
      image_alts: ["A", "B", "C"],
    };

    const next = removeProductGalleryImage(form, 1);

    expect(next.images).toEqual(["a.jpg", "c.jpg"]);
    expect(next.image_alts).toEqual(["A", "C"]);
  });

  it("updates one gallery alt without mutating the original form", () => {
    const form = {
      ...createEmptyProductForm(),
      images: ["a.jpg", "b.jpg"],
      image_alts: ["A", "B"],
    };

    const next = updateProductGalleryImageAlt(form, 1, "Better B");

    expect(next.image_alts).toEqual(["A", "Better B"]);
    expect(form.image_alts).toEqual(["A", "B"]);
  });

  it("清空商品视频链接", () => {
    const form = { ...createEmptyProductForm(), video_url: "https://example.com/video.mp4" };

    expect(clearProductVideoUrl(form).video_url).toBe("");
  });
});
