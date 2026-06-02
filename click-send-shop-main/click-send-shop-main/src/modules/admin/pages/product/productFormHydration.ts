import type { Product, ProductSpecGroup, ProductSpecValue } from "@/types/product";
import { resolveStockLimitsFromProduct } from "@/utils/inventoryStockFields";
import { DEFAULT_VARIANT_TITLE } from "@/utils/productFormVariantUtils";
import type { AdminVariantForm, ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";

function buildProductVariants(product: Product): AdminVariantForm[] {
  if (product.variants?.length) {
    return product.variants.map((variant, index) => ({
      id: variant.id,
      title: variant.title || (variant.is_default ? DEFAULT_VARIANT_TITLE : ""),
      sku_code: (variant.sku_code as string) || "",
      price: String(variant.price ?? ""),
      original_price: variant.original_price != null ? String(variant.original_price) : "",
      cost_price: variant.cost_price != null ? String(variant.cost_price) : "",
      stock: String(variant.stock ?? ""),
      stock_warning_threshold: variant.stock_warning_threshold != null ? String(variant.stock_warning_threshold) : "",
      stock_lower_limit: variant.stock_lower_limit != null ? String(variant.stock_lower_limit) : "",
      stock_upper_limit: variant.stock_upper_limit != null ? String(variant.stock_upper_limit) : "",
      barcode: variant.barcode || "",
      image_url: variant.image_url || "",
      weight: variant.weight != null ? String(variant.weight) : "",
      enabled: variant.enabled !== false,
      sort_order: variant.sort_order ?? index,
      is_default: !!variant.is_default,
      spec_value_ids: Array.isArray(variant.spec_value_ids) ? variant.spec_value_ids : [],
    }));
  }

  return [
    {
      title: DEFAULT_VARIANT_TITLE,
      sku_code: "",
      price: product.price?.toString() || "",
      stock: product.stock?.toString() || "",
      stock_warning_threshold:
        product.stock_warning_threshold != null
          ? String(product.stock_warning_threshold)
          : (product.default_variant?.stock_warning_threshold != null
            ? String(product.default_variant.stock_warning_threshold)
            : ""),
      stock_lower_limit:
        product.stock_lower_limit != null
          ? String(product.stock_lower_limit)
          : (product.default_variant?.stock_lower_limit != null ? String(product.default_variant.stock_lower_limit) : ""),
      stock_upper_limit:
        product.stock_upper_limit != null
          ? String(product.stock_upper_limit)
          : (product.default_variant?.stock_upper_limit != null ? String(product.default_variant.stock_upper_limit) : ""),
      sort_order: 0,
      is_default: true,
      enabled: true,
    },
  ];
}

function buildProductSpecGroups(product: Product): ProductFormPayloadSlice["spec_groups"] {
  if (!Array.isArray(product.spec_groups)) return [];

  return product.spec_groups.map((group: ProductSpecGroup, groupIndex: number) => ({
    id: group.id,
    name: group.name || "",
    sort_order: group.sort_order ?? groupIndex,
    values: Array.isArray(group.values)
      ? group.values.map((value: ProductSpecValue, valueIndex: number) => ({
        id: value.id,
        value: value.value || "",
        image_url: value.image_url || "",
        sort_order: value.sort_order ?? valueIndex,
      }))
      : [],
  }));
}

export function buildProductFormFromProduct(product: Product): ProductFormPayloadSlice {
  const status = product.status === "draft" || product.status === "inactive" ? product.status : "active";
  const variants = buildProductVariants(product);
  const mainStockLimits = resolveStockLimitsFromProduct(product);
  const productImages = Array.isArray(product.images) ? product.images : [];
  const productImageAlts = Array.isArray(product.image_alts) ? product.image_alts : [];

  return {
    name: product.name || "",
    price: product.price?.toString() || "",
    original_price: product.original_price != null ? product.original_price.toString() : "",
    cost_price: (variants.find((variant) => variant.is_default)?.cost_price ?? "") || "",
    sales_count: product.sales_count != null ? String(product.sales_count) : "0",
    stock: product.stock?.toString() || "",
    stock_warning_threshold: mainStockLimits.warning,
    stock_lower_limit: mainStockLimits.lower,
    stock_upper_limit: mainStockLimits.upper,
    category_id: product.category_id || "",
    sort_order: product.sort_order?.toString() || "",
    description: product.description || "",
    cover_image: product.cover_image || "",
    cover_image_alt: product.cover_image_alt || "",
    video_url: product.video_url || "",
    images: productImages,
    image_alts: productImages.map((_, index) => productImageAlts[index] || ""),
    status,
    is_hot: !!product.is_hot,
    is_new: !!product.is_new,
    is_recommended: !!product.is_recommended,
    is_age_restricted: !!product.is_age_restricted,
    minimum_age: product.minimum_age != null ? String(product.minimum_age) : "",
    compliance_type: product.compliance_type || "normal",
    region_notice: product.region_notice || "",
    compliance_notice: product.compliance_notice || "",
    allow_index: product.allow_index == null ? true : Number(product.allow_index) === 1,
    tag_ids: Array.isArray(product.tags) ? product.tags.map((tag: { id: string }) => tag.id) : [],
    spec_groups: buildProductSpecGroups(product),
    variants,
  };
}
