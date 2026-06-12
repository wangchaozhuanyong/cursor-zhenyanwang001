import type { AdminProductUpsertPayload } from "@/types/product";
import { DEFAULT_VARIANT_TITLE } from "@/utils/productFormVariantUtils";
import type { ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";

type BuildAdminProductUpsertPayloadOptions = {
  publish?: boolean;
  includeStock?: boolean;
};

function parseNonnegativeInt(value: string | undefined, fallback = 0): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseNonnegativeFloat(value: string | undefined, fallback = 0): number {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseOptionalNonnegativeInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseOptionalNonnegativeFloat(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function buildAdminProductUpsertPayload(
  form: ProductFormPayloadSlice,
  options: BuildAdminProductUpsertPayloadOptions = {},
): AdminProductUpsertPayload {
  const opNum = parseOptionalNonnegativeFloat(form.original_price);
  const costNum = parseOptionalNonnegativeFloat(form.cost_price);
  const scNum = parseNonnegativeInt(form.sales_count, 0);
  const mainPrice = parseNonnegativeFloat(form.price, 0);
  const mainStock = parseNonnegativeInt(form.stock, 0);
  const mainStockWarningThreshold = form.stock_warning_threshold
    ? parseNonnegativeInt(form.stock_warning_threshold, 5)
    : 5;
  const mainStockLowerLimit = parseOptionalNonnegativeInt(form.stock_lower_limit);
  const mainStockUpperLimit = parseOptionalNonnegativeInt(form.stock_upper_limit);
  const isSingleDefaultSku = form.spec_groups.length === 0 && form.variants.length === 1;

  const variantsPayload: NonNullable<AdminProductUpsertPayload["variants"]> = form.variants.map((variant, index) => ({
    id: variant.id,
    title: (variant.title || (isSingleDefaultSku && variant.is_default ? DEFAULT_VARIANT_TITLE : "")).trim(),
    sku_code: variant.sku_code.trim() || null,
    price: parseNonnegativeFloat(variant.price, 0),
    original_price: parseOptionalNonnegativeFloat(variant.original_price),
    cost_price: parseOptionalNonnegativeFloat(variant.cost_price),
    stock: parseNonnegativeInt(variant.stock, 0),
    stock_warning_threshold: variant.stock_warning_threshold
      ? parseNonnegativeInt(variant.stock_warning_threshold, 5)
      : 5,
    stock_lower_limit: parseOptionalNonnegativeInt(variant.stock_lower_limit),
    stock_upper_limit: parseOptionalNonnegativeInt(variant.stock_upper_limit),
    barcode: variant.barcode?.trim() || null,
    image_url: variant.image_url?.trim() || null,
    weight: parseOptionalNonnegativeFloat(variant.weight),
    enabled: variant.enabled !== false,
    sort_order: variant.sort_order ?? index,
    is_default: variant.is_default,
    spec_value_ids: variant.spec_value_ids ?? [],
  }));

  const defaultVariantIndex = variantsPayload.findIndex((variant) => variant.is_default);
  if (defaultVariantIndex >= 0) {
    variantsPayload[defaultVariantIndex] = {
      ...variantsPayload[defaultVariantIndex],
      price: mainPrice,
      original_price: opNum,
      cost_price:
        costNum == null
          ? variantsPayload[defaultVariantIndex].cost_price
          : costNum,
      stock: isSingleDefaultSku ? mainStock : variantsPayload[defaultVariantIndex].stock,
      stock_warning_threshold: mainStockWarningThreshold,
      stock_lower_limit: mainStockLowerLimit,
      stock_upper_limit: mainStockUpperLimit,
    };
  }

  const complianceType = (form.compliance_type || "normal").trim();
  const shouldNoindex = form.is_age_restricted || complianceType !== "normal";
  const payload: AdminProductUpsertPayload = {
    name: form.name.trim(),
    price: mainPrice,
    stock_warning_threshold: mainStockWarningThreshold,
    stock_lower_limit: mainStockLowerLimit,
    stock_upper_limit: mainStockUpperLimit,
    original_price: form.original_price === "" || !Number.isFinite(opNum) ? null : opNum,
    sales_count: Number.isFinite(scNum) ? scNum : 0,
    category_id: form.category_id || "",
    sort_order: parseInt(form.sort_order, 10) || 0,
    description: form.description,
    cover_image: form.cover_image,
    cover_image_alt: form.cover_image_alt.trim(),
    video_url: form.video_url.trim(),
    images: form.images,
    image_alts: form.images.map((_, index) => (form.image_alts[index] || "").trim()),
    status: options.publish ? "active" : form.status,
    is_hot: form.is_hot,
    is_new: form.is_new,
    isNewArrival: form.is_new,
    is_recommended: form.is_recommended,
    is_age_restricted: form.is_age_restricted,
    minimum_age: form.minimum_age ? parseNonnegativeInt(form.minimum_age, 0) : null,
    compliance_type: complianceType,
    region_notice: form.region_notice?.trim() || null,
    compliance_notice: form.compliance_notice?.trim() || null,
    allow_index: shouldNoindex ? false : form.allow_index,
    spec_groups: form.spec_groups.map((group, groupIndex) => ({
      id: group.id,
      name: group.name,
      sort_order: group.sort_order ?? groupIndex,
      values: group.values.map((value, valueIndex) => ({
        id: value.id,
        value: value.value,
        image_url: value.image_url || null,
        sort_order: value.sort_order ?? valueIndex,
      })),
    })),
    variants: variantsPayload,
    tag_ids: form.tag_ids,
  };

  if (options.includeStock) {
    payload.stock = mainStock;
  }

  return payload;
}
