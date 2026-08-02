import { describe, expect, it } from "vitest";
import { createEmptyProductForm } from "@/modules/admin/pages/product/productFormInitialState";
import {
  getProductFormSaveBlockMessage,
  getProductPublishReadiness,
} from "@/modules/admin/pages/product/productFormValidation";

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

  it("blocks negative SKU stock before backend schema validation", () => {
    const form = {
      ...createEmptyProductForm(),
      name: "Product",
      stock: "7",
      spec_groups: [
        {
          name: "规格",
          sort_order: 0,
          values: [{ value: "1g*10 / 条", sort_order: 0 }],
        },
      ],
      variants: [
        {
          ...createEmptyProductForm().variants[0],
          stock: "-1",
          image_url: "https://example.com/sku.webp",
        },
      ],
    };

    expect(getProductFormSaveBlockMessage({ form, uploadBusy: false, isNew: true })).toBe(
      "第 1 行 SKU 库存不能小于 0",
    );
  });

  it("validates single default SKU stock by the product-level stock field", () => {
    const form = {
      ...createEmptyProductForm(),
      name: "Product",
      stock: "7",
      variants: [
        {
          ...createEmptyProductForm().variants[0],
          stock: "-1",
          is_default: true,
        },
      ],
    };

    expect(getProductFormSaveBlockMessage({ form, uploadBusy: false, isNew: false, productId: "p1" })).toBeNull();
  });

  it("blocks negative product-level stock for the single default SKU", () => {
    const form = {
      ...createEmptyProductForm(),
      name: "Product",
      stock: "-1",
    };

    expect(getProductFormSaveBlockMessage({ form, uploadBusy: false, isNew: false, productId: "p1" })).toBe(
      "默认 SKU 库存不能小于 0",
    );
  });

  it("blocks negative SKU warning threshold before backend schema validation", () => {
    const form = {
      ...createEmptyProductForm(),
      name: "Product",
      variants: [
        {
          ...createEmptyProductForm().variants[0],
          stock_warning_threshold: "-1",
        },
      ],
    };

    expect(getProductFormSaveBlockMessage({ form, uploadBusy: false, isNew: true })).toBe(
      "第 1 行 SKU 预警值不能小于 0",
    );
  });

  it("requires an id when editing an existing product", () => {
    const form = { ...createEmptyProductForm(), name: "Product" };

    expect(getProductFormSaveBlockMessage({ form, uploadBusy: false, isNew: false })).toBe(
      "商品编号缺失，请返回商品列表重新进入",
    );
    expect(getProductFormSaveBlockMessage({ form, uploadBusy: false, isNew: false, productId: "p1" })).toBeNull();
  });
});

describe("getProductPublishReadiness", () => {
  it("blocks incomplete products from publishing but keeps quality hints as warnings", () => {
    const readiness = getProductPublishReadiness(createEmptyProductForm());

    expect(readiness.blockers).toEqual([
      "请填写商品名称",
      "请选择商品分类",
      "请上传封面图，或为可售 SKU 设置图片",
      "商品售价必须大于 0",
    ]);
    expect(readiness.warnings).toContain("建议补充商品图集");
  });

  it("accepts a complete sold-out product for publishing", () => {
    const form = {
      ...createEmptyProductForm(),
      name: "商品",
      category_id: "category-1",
      cover_image: "https://example.com/product.webp",
      cover_image_alt: "商品封面",
      price: "28",
      stock: "0",
      images: ["https://example.com/detail.webp"],
    };

    expect(getProductPublishReadiness(form)).toEqual({ blockers: [], warnings: [] });
  });

  it("uses an enabled SKU image as the storefront card fallback", () => {
    const form = {
      ...createEmptyProductForm(),
      name: "商品",
      category_id: "category-1",
      price: "28",
      variants: [{
        ...createEmptyProductForm().variants[0],
        image_url: "https://example.com/sku.webp",
      }],
    };

    expect(getProductPublishReadiness(form).blockers).not.toContain(
      "请上传封面图，或为可售 SKU 设置图片",
    );
  });
});
