import type { ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";

type ProductFormSaveValidationInput = {
  form: ProductFormPayloadSlice;
  uploadBusy: boolean;
  isNew: boolean;
  productId?: string;
};

export type ProductPublishReadiness = {
  blockers: string[];
  warnings: string[];
};

function isNegativeNumber(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed < 0;
}

function stockValueForSubmit(form: ProductFormPayloadSlice, index: number): string {
  const variant = form.variants[index];
  const isSingleDefaultSku = form.spec_groups.length === 0 && form.variants.length === 1;
  if (variant?.is_default && isSingleDefaultSku) return form.stock;
  return variant?.stock ?? "";
}

function positivePrice(value: string | undefined): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

export function getProductPublishReadiness(form: ProductFormPayloadSlice): ProductPublishReadiness {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const enabledVariants = form.variants.filter((variant) => variant.enabled !== false);
  const isSingleDefaultSku = form.spec_groups.length === 0 && form.variants.length === 1;
  const hasCardImage = Boolean(
    form.cover_image.trim()
      || enabledVariants.find((variant) => variant.is_default)?.image_url?.trim()
      || enabledVariants.find((variant) => variant.image_url?.trim())?.image_url?.trim(),
  );

  if (!form.name.trim()) blockers.push("请填写商品名称");
  if (!form.category_id.trim()) blockers.push("请选择商品分类");
  if (!hasCardImage) blockers.push("请上传封面图，或为可售 SKU 设置图片");
  if (!enabledVariants.length) blockers.push("至少启用一条可售 SKU");

  if (isSingleDefaultSku) {
    if (!positivePrice(form.price)) blockers.push("商品售价必须大于 0");
  } else {
    const invalidPriceIndex = form.variants.findIndex(
      (variant) => variant.enabled !== false && !positivePrice(variant.price),
    );
    if (invalidPriceIndex >= 0) blockers.push(`第 ${invalidPriceIndex + 1} 行可售 SKU 的售价必须大于 0`);
  }

  if (form.cover_image.trim() && !form.cover_image_alt.trim()) warnings.push("建议补充封面图说明，提升无障碍与搜索可读性");
  if (!form.description.trim()) warnings.push("建议补充商品描述");
  if (!form.images.some((image) => image.trim())) warnings.push("建议补充商品图集");

  return { blockers, warnings };
}

export function getProductFormSaveBlockMessage({
  form,
  uploadBusy,
  isNew,
  productId,
}: ProductFormSaveValidationInput): string | null {
  if (uploadBusy) return "图片仍在上传中，请等待上传完成后再保存商品。";
  if (!form.name.trim()) return "请输入商品名称";
  if (!form.variants.length) return "至少保留一条规格";
  if (isNegativeNumber(form.stock)) return "默认 SKU 库存不能小于 0";
  const negativeStockIndex = form.variants.findIndex((_, index) => {
    return isNegativeNumber(stockValueForSubmit(form, index));
  });
  if (negativeStockIndex >= 0) return `第 ${negativeStockIndex + 1} 行 SKU 库存不能小于 0`;
  const negativeWarningIndex = form.variants.findIndex((variant) => isNegativeNumber(variant.stock_warning_threshold));
  if (negativeWarningIndex >= 0) return `第 ${negativeWarningIndex + 1} 行 SKU 预警值不能小于 0`;
  if (!isNew && !productId) return "商品编号缺失，请返回商品列表重新进入";
  return null;
}
