import type { ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";

type ProductFormSaveValidationInput = {
  form: ProductFormPayloadSlice;
  uploadBusy: boolean;
  isNew: boolean;
  productId?: string;
};

export function getProductFormSaveBlockMessage({
  form,
  uploadBusy,
  isNew,
  productId,
}: ProductFormSaveValidationInput): string | null {
  if (uploadBusy) return "图片仍在上传中，请等待上传完成后再保存商品。";
  if (!form.name.trim()) return "请输入商品名称";
  if (!form.variants.length) return "至少保留一条规格";
  if (!isNew && !productId) return "商品编号缺失，请返回商品列表重新进入";
  return null;
}
