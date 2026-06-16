import { isProductNewArrival } from "@/utils/productNewArrival";
import { formatProductSales, getProductSalesCount, productSalesLabel } from "@/utils/productSales";
import type { Product } from "@/types/product";

export type ProductCardV2Badge = {
  key: string;
  label: string;
  tone: "hot" | "new" | "sale" | "normal";
};

export type ProductCardV2Model = {
  id: string;
  name: string;
  imageUrl?: string;
  imageAlt: string;
  price: number;
  priceText: string;
  originalPrice?: number;
  originalPriceText?: string;
  soldOut: boolean;
  badges: ProductCardV2Badge[];
  href: string;
  salesText?: string;
  variantText?: string;
  activityText?: string;
  decisionTexts: string[];
};

type ProductPriceFields = Product & {
  min_price?: number | null;
  max_price?: number | null;
  max_original_price?: number | null;
  variant_count?: number | null;
};

export function money(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(2).replace(/\.00$/, "");
}

function positiveInteger(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

function buildSalesText(product: Product) {
  const totalSales = getProductSalesCount(product.sales_count);
  if (totalSales > 0) return productSalesLabel(totalSales);

  const sales30d = positiveInteger(product.sales_qty_30d);
  if (sales30d > 0) return `30天售 ${formatProductSales(sales30d)}`;

  const sales7d = positiveInteger(product.sales_qty_7d);
  if (sales7d > 0) return `7天售 ${formatProductSales(sales7d)}`;

  return undefined;
}

function buildVariantText(product: ProductPriceFields) {
  const explicitCount = positiveInteger(product.enabled_sku_count ?? product.sku_count ?? product.variant_count);
  const variantCount = explicitCount || positiveInteger(product.variants?.filter((variant) => variant.enabled !== false).length);
  return variantCount > 1 ? `${variantCount}种规格` : undefined;
}

function buildActivityText(product: Product) {
  const promoLabel = String(product.activity_promo_label || "").trim();
  if (promoLabel) return promoLabel.slice(0, 18);

  const activity = product.active_activity;
  if (!activity) return undefined;

  if (activity.type === "flash_sale" || activity.type === "limited_time_discount") {
    const remaining = positiveInteger(activity.remaining_stock);
    const label = activity.type === "limited_time_discount" ? "折扣" : "秒杀";
    return remaining > 0 ? `${label}剩余 ${remaining}` : activity.type === "limited_time_discount" ? "限时折扣价" : "限时秒杀价";
  }

  const threshold = Number(activity.threshold_amount || 0);
  const discount = Number(activity.discount_amount || 0);
  if (threshold > 0 && discount > 0) return `满 RM ${money(threshold)} 减 RM ${money(discount)}`;

  return activity.title ? String(activity.title).trim().slice(0, 18) : undefined;
}

export function buildProductCardV2Model(product: Product): ProductCardV2Model {
  const pricedProduct = product as ProductPriceFields;
  const price = Number(pricedProduct.min_price ?? product.price ?? 0);
  const maxPrice = Number(pricedProduct.max_price ?? product.price ?? price);
  const hasRange = Number.isFinite(maxPrice) && maxPrice > price;
  const displayComparePrice = hasRange ? maxPrice : Number(product.price || price);

  const original = Number(pricedProduct.max_original_price ?? product.original_price ?? 0);
  const showOriginal = Number.isFinite(original) && original > displayComparePrice;

  const stock = Number(product.default_variant?.stock ?? product.stock ?? 0);
  const soldOut = stock <= 0;

  const badges: ProductCardV2Badge[] = [];

  if (product.active_activity) {
    const activityTypeLabel = product.active_activity.type === "flash_sale"
      ? "秒杀"
      : product.active_activity.type === "limited_time_discount"
        ? "折扣"
        : product.active_activity.type === "member_price"
          ? "会员"
          : "满减";
    badges.push({
      key: "activity",
      label: activityTypeLabel,
      tone: "sale",
    });
  }

  if (product.is_hot) {
    badges.push({ key: "hot", label: "热销", tone: "hot" });
  }

  if (isProductNewArrival(product)) {
    badges.push({ key: "new", label: "新品", tone: "new" });
  }

  const salesText = buildSalesText(product);
  const variantText = buildVariantText(pricedProduct);
  const activityText = buildActivityText(product);
  const decisionTexts = [salesText, variantText, activityText].filter(Boolean).slice(0, 3) as string[];

  return {
    id: product.id,
    name: product.name,
    imageUrl: product.cover_image,
    imageAlt: product.cover_image_alt || `${product.name} 商品图片`,
    price,
    priceText: hasRange ? `${money(price)}-${money(maxPrice)}` : money(product.price || price),
    originalPrice: showOriginal ? original : undefined,
    originalPriceText: showOriginal ? money(original) : undefined,
    soldOut,
    badges: badges.slice(0, 2),
    href: `/product/${product.id}`,
    salesText,
    variantText,
    activityText,
    decisionTexts,
  };
}
