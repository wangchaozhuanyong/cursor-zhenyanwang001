import type { ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";
import type { Product, ProductTag, ProductVariant } from "@/types/product";

function numberValue(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildAdminProductPreview(
  form: ProductFormPayloadSlice,
  allTags: ProductTag[],
): Product {
  const singleDefaultSku = form.spec_groups.length === 0 && form.variants.length === 1;
  const variants: ProductVariant[] = form.variants.map((variant, index) => ({
    id: variant.id || `preview-variant-${index}`,
    title: variant.title || `SKU ${index + 1}`,
    sku_code: variant.sku_code || null,
    price: numberValue(singleDefaultSku && variant.is_default ? form.price : variant.price),
    original_price: numberValue(singleDefaultSku && variant.is_default ? form.original_price : variant.original_price),
    stock: numberValue(singleDefaultSku && variant.is_default ? form.stock : variant.stock),
    image_url: variant.image_url || null,
    enabled: variant.enabled !== false,
    sort_order: variant.sort_order,
    is_default: variant.is_default,
  }));
  const enabledVariants = variants.filter((variant) => variant.enabled !== false);
  const defaultVariant = enabledVariants.find((variant) => variant.is_default) || enabledVariants[0] || null;
  const enabledPrices = enabledVariants.map((variant) => variant.price).filter((price) => price > 0);
  const minPrice = enabledPrices.length ? Math.min(...enabledPrices) : numberValue(form.price);
  const maxPrice = enabledPrices.length ? Math.max(...enabledPrices) : numberValue(form.price);

  const preview: Product & { min_price?: number; max_price?: number } = {
    id: "admin-preview",
    name: form.name.trim() || "商品名称",
    cover_image: form.cover_image.trim(),
    cover_image_alt: form.cover_image_alt.trim() || undefined,
    images: form.images.filter(Boolean),
    image_alts: form.image_alts,
    price: minPrice,
    min_price: minPrice,
    max_price: maxPrice,
    original_price: numberValue(form.original_price) || null,
    points: 0,
    category_id: form.category_id,
    stock: numberValue(form.stock),
    status: form.status,
    sort_order: numberValue(form.sort_order),
    variants,
    default_variant: defaultVariant,
    sku_count: enabledVariants.length,
    enabled_sku_count: enabledVariants.length,
    description: form.description,
    is_recommended: form.is_recommended,
    is_new: form.is_new,
    is_hot: form.is_hot,
    tags: form.tag_ids
      .map((tagId) => allTags.find((tag) => tag.id === tagId))
      .filter((tag): tag is ProductTag => Boolean(tag)),
  };

  return preview;
}
