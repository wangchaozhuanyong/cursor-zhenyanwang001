import type {
  AdminVariantForm,
  ProductFormPayloadSlice,
  ProductVariantMatrixFormSlice,
} from "@/modules/admin/pages/product/productFormTypes";

export type DefaultVariantSyncedField = Extract<keyof AdminVariantForm, keyof ProductFormPayloadSlice>;

const DEFAULT_VARIANT_SYNC_FIELDS = new Set<keyof AdminVariantForm>([
  "price",
  "original_price",
  "cost_price",
  "stock",
  "stock_warning_threshold",
  "stock_lower_limit",
  "stock_upper_limit",
]);

function syncDefaultVariantFields<T extends ProductVariantMatrixFormSlice>(
  form: T,
  variant: AdminVariantForm,
): T {
  return {
    ...form,
    price: variant.price || form.price,
    original_price: variant.original_price || "",
    cost_price: variant.cost_price || "",
    stock: variant.stock || form.stock,
    stock_warning_threshold: variant.stock_warning_threshold || form.stock_warning_threshold,
    stock_lower_limit: variant.stock_lower_limit || "",
    stock_upper_limit: variant.stock_upper_limit || "",
  };
}

export function updateProductDefaultVariantField(
  form: ProductFormPayloadSlice,
  field: DefaultVariantSyncedField,
  value: string,
): ProductFormPayloadSlice {
  const nextForm = { ...form, [field]: value };
  const defaultIdx = form.variants.findIndex((variant) => variant.is_default);
  if (defaultIdx < 0) return nextForm;

  const variants = [...form.variants];
  variants[defaultIdx] = { ...variants[defaultIdx], [field]: value };
  return { ...nextForm, variants };
}

export function updateProductVariantField<T extends ProductVariantMatrixFormSlice, K extends keyof AdminVariantForm>(
  form: T,
  index: number,
  field: K,
  value: AdminVariantForm[K],
): T {
  const current = form.variants[index];
  if (!current) return form;

  const variants = [...form.variants];
  const updated = { ...current, [field]: value };
  variants[index] = updated;
  const nextForm = { ...form, variants };
  if (!updated.is_default || !DEFAULT_VARIANT_SYNC_FIELDS.has(field)) return nextForm;
  return { ...syncDefaultVariantFields(nextForm, updated), [field]: value };
}

export function selectProductDefaultVariant<T extends ProductVariantMatrixFormSlice>(
  form: T,
  index: number,
): T {
  const nextDefault = form.variants[index];
  if (!nextDefault) return form;

  return syncDefaultVariantFields({
    ...form,
    variants: form.variants.map((row, rowIndex) => ({ ...row, is_default: rowIndex === index })),
  }, nextDefault);
}

export function removeProductVariantRow<T extends ProductVariantMatrixFormSlice>(
  form: T,
  index: number,
): T {
  if (form.variants.length <= 1) return form;

  const variants = form.variants.filter((_, rowIndex) => rowIndex !== index);
  if (variants.some((variant) => variant.is_default)) return { ...form, variants };

  variants[0] = { ...variants[0], is_default: true };
  return selectProductDefaultVariant({ ...form, variants }, 0);
}

export function removeProductGalleryImage(
  form: ProductFormPayloadSlice,
  index: number,
): ProductFormPayloadSlice {
  return {
    ...form,
    images: form.images.filter((_, imageIndex) => imageIndex !== index),
    image_alts: form.image_alts.filter((_, imageIndex) => imageIndex !== index),
  };
}

export function updateProductGalleryImageAlt(
  form: ProductFormPayloadSlice,
  index: number,
  value: string,
): ProductFormPayloadSlice {
  const imageAlts = [...form.image_alts];
  imageAlts[index] = value;
  return { ...form, image_alts: imageAlts };
}

export function clearProductVideoUrl(form: ProductFormPayloadSlice): ProductFormPayloadSlice {
  return { ...form, video_url: "" };
}
