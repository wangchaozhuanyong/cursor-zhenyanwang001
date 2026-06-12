import type { ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";

type ProductFormSaveValidationInput = {
  form: ProductFormPayloadSlice;
  uploadBusy: boolean;
  isNew: boolean;
  productId?: string;
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
