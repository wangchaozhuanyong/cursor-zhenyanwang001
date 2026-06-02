import { describe, expect, it } from "vitest";
import { createEmptyProductForm } from "@/modules/admin/pages/product/productFormInitialState";
import { getProductFormSaveBlockMessage } from "@/modules/admin/pages/product/productFormValidation";

describe("getProductFormSaveBlockMessage", () => {
  it("blocks saving while media upload is still running", () => {
    const form = { ...createEmptyProductForm(), name: "Product" };

    expect(getProductFormSaveBlockMessage({ form, uploadBusy: true, isNew: true })).toBe(
      "图片仍在上传中，请等待上传完成后再保存商品。",
    );
  });

  it("requires a product name", () => {
    const form = { ...createEmptyProductForm(), name: "   " };

    expect(getProductFormSaveBlockMessage({ form, uploadBusy: false, isNew: true })).toBe("请输入商品名称");
  });

  it("requires at least one SKU row", () => {
    const form = { ...createEmptyProductForm(), name: "Product", variants: [] };

    expect(getProductFormSaveBlockMessage({ form, uploadBusy: false, isNew: true })).toBe("至少保留一条规格");
  });

  it("requires an id when editing an existing product", () => {
    const form = { ...createEmptyProductForm(), name: "Product" };

    expect(getProductFormSaveBlockMessage({ form, uploadBusy: false, isNew: false })).toBe(
      "商品编号缺失，请返回商品列表重新进入",
    );
    expect(getProductFormSaveBlockMessage({ form, uploadBusy: false, isNew: false, productId: "p1" })).toBeNull();
  });
});
