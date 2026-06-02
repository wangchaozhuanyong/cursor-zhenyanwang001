import type { AdminSpecGroup, AdminVariantForm, ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";
import {
  cartesianSpecValues,
  DEFAULT_VARIANT_TITLE,
  MAX_SKU_MATRIX_SIZE,
  specComboKey,
} from "@/utils/productFormVariantUtils";

export type RegenerateProductSkuMatrixResult =
  | { status: "updated"; form: ProductFormPayloadSlice }
  | { status: "tooLarge"; maxSize: number };

export function buildRegeneratedProductSkuMatrix(
  form: ProductFormPayloadSlice,
  nextGroups: AdminSpecGroup[],
): RegenerateProductSkuMatrixResult {
  const combos = cartesianSpecValues(nextGroups);
  if (!combos.length) {
    return { status: "updated", form: { ...form, spec_groups: nextGroups } };
  }
  if (combos.length > MAX_SKU_MATRIX_SIZE) {
    return { status: "tooLarge", maxSize: MAX_SKU_MATRIX_SIZE };
  }

  const existingByKey = new Map(
    form.variants
      .filter((variant) => (variant.spec_value_ids ?? []).length > 0)
      .map((variant) => [specComboKey(variant.spec_value_ids ?? []), variant]),
  );
  const nextVariants = combos.map((combo, index) => {
    const ids = combo.map((item) => item.value.id || "").filter(Boolean);
    const title = combo.map((item) => item.value.value.trim()).join(" / ");
    const old = existingByKey.get(specComboKey(ids));
    return {
      id: old?.id,
      title,
      sku_code: old?.sku_code || "",
      price: old?.price || form.price || "0",
      original_price: old?.original_price || "",
      cost_price: old?.cost_price || "",
      stock: old?.stock || "0",
      stock_warning_threshold:
        old?.stock_warning_threshold || (index === 0 ? form.stock_warning_threshold || "5" : "5"),
      stock_lower_limit: old?.stock_lower_limit || (index === 0 ? form.stock_lower_limit || "" : ""),
      stock_upper_limit: old?.stock_upper_limit || (index === 0 ? form.stock_upper_limit || "" : ""),
      barcode: old?.barcode || "",
      image_url: old?.image_url || "",
      weight: old?.weight || "",
      enabled: old?.enabled !== false,
      sort_order: index,
      is_default: old?.is_default || index === 0,
      spec_value_ids: ids,
    } satisfies AdminVariantForm;
  });
  if (!nextVariants.some((variant) => variant.is_default) && nextVariants[0]) {
    nextVariants[0].is_default = true;
  }
  let seenDefault = false;

  return {
    status: "updated",
    form: {
      ...form,
      spec_groups: nextGroups,
      variants: nextVariants.map((variant) => {
        if (variant.is_default && !seenDefault) {
          seenDefault = true;
          return variant;
        }
        return { ...variant, is_default: false };
      }),
    },
  };
}

export function buildMatrixModeProductForm(
  form: ProductFormPayloadSlice,
  createId: () => string,
): ProductFormPayloadSlice {
  const firstVariant = form.variants[0];
  const valueId = createId();
  const group: AdminSpecGroup = {
    id: createId(),
    name: "规格",
    sort_order: 0,
    values: [{ id: valueId, value: firstVariant?.title || DEFAULT_VARIANT_TITLE, image_url: "", sort_order: 0 }],
  };

  return {
    ...form,
    spec_groups: [group],
    variants: form.variants.slice(0, 1).map((variant) => ({
      ...variant,
      title: variant.title || DEFAULT_VARIANT_TITLE,
      spec_value_ids: [valueId],
      enabled: variant.enabled !== false,
      is_default: true,
      stock_warning_threshold: variant.stock_warning_threshold || form.stock_warning_threshold || "5",
      stock_lower_limit: variant.stock_lower_limit || form.stock_lower_limit || "",
      stock_upper_limit: variant.stock_upper_limit || form.stock_upper_limit || "",
    })),
  };
}
