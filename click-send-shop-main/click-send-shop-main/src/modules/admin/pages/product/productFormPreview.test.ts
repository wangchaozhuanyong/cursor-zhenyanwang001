import { describe, expect, it } from "vitest";
import { createEmptyProductForm } from "@/modules/admin/pages/product/productFormInitialState";
import { buildAdminProductPreview } from "@/modules/admin/pages/product/productFormPreview";

describe("buildAdminProductPreview", () => {
  it("mirrors multi-SKU price range, stock and selected tags", () => {
    const form = {
      ...createEmptyProductForm(),
      name: "高端商品",
      category_id: "category-1",
      cover_image: "/cover.webp",
      tag_ids: ["tag-1"],
      spec_groups: [{ name: "规格", sort_order: 0, values: [] }],
      variants: [
        { ...createEmptyProductForm().variants[0], title: "A", price: "45", stock: "0", is_default: true },
        { ...createEmptyProductForm().variants[0], title: "B", price: "430", stock: "6", is_default: false },
      ],
    };

    const preview = buildAdminProductPreview(form, [{ id: "tag-1", name: "限定", sort_order: 0 }]);

    expect(preview.price).toBe(45);
    expect((preview as typeof preview & { max_price: number }).max_price).toBe(430);
    expect(preview.default_variant?.stock).toBe(0);
    expect(preview.tags?.map((tag) => tag.name)).toEqual(["限定"]);
  });
});
