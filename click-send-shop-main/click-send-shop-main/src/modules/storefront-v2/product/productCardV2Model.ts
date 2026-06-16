import { isProductNewArrival } from "@/utils/productNewArrival";
import { formatProductSales, getProductSalesCount, productSalesLabel } from "@/utils/productSales";
import type { Product, ProductActiveActivity } from "@/types/product";

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
  activityProgressPercent?: number;
  activityProgressText?: string;
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

function positiveNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function firstPositiveNumber(...values: unknown[]) {
  for (const value of values) {
    const n = positiveNumber(value);
    if (n > 0) return n;
  }
  return 0;
}

function clampPercent(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
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

  const activityPromoLabel = String(activity.promo_label || "").trim();
  if (activityPromoLabel) return activityPromoLabel.slice(0, 18);

  if (activity.status !== "active" && activity.status_label) {
    return String(activity.status_label).trim().slice(0, 18);
  }

  if (activity.type === "flash_sale" || activity.type === "limited_time_discount") {
    const remaining = positiveInteger(activity.remaining_stock);
    const label = activity.type === "limited_time_discount" ? "折扣" : "秒杀";
    return remaining > 0 ? `${label}剩余 ${remaining}` : activity.type === "limited_time_discount" ? "限时折扣价" : "限时秒杀价";
  }

  const threshold = Number(activity.threshold_amount || 0);
  const discount = Number(activity.discount_amount || 0);
  if (threshold > 0 && discount > 0) return `满 RM ${money(threshold)} 减 RM ${money(discount)}`;

  const percent = Number(activity.discount_percent || 0);
  if (threshold > 0 && percent > 0) return `满 RM ${money(threshold)} 享 ${money(percent)}%`;

  return activity.title ? String(activity.title).trim().slice(0, 18) : undefined;
}

function activityBadgeLabel(type: ProductActiveActivity["type"]) {
  if (type === "flash_sale") return "秒杀";
  if (type === "limited_time_discount") return "限时折扣";
  if (type === "member_price") return "会员价";
  if (type === "full_discount") return "满折";
  if (type === "points_reward") return "积分";
  if (type === "checkin_reward") return "签到";
  if (type === "campaign") return "活动";
  return "满减";
}

function buildActivityProgress(product: Product) {
  const activity = product.active_activity;
  if (!activity) return {};

  const stock = positiveInteger(activity.activity_stock);
  const sold = positiveInteger(activity.sold_count);
  const remaining = positiveInteger(activity.remaining_stock);
  const explicitPercent = clampPercent(activity.stock_progress_percent);
  const computedPercent = stock > 0 ? clampPercent((sold / stock) * 100) : 0;
  const percent = explicitPercent || computedPercent;

  if (!percent && !remaining && !stock) return {};

  const limit = positiveInteger(activity.limit_per_user);
  const stockText = remaining > 0 ? `剩 ${remaining}` : stock > 0 ? "库存紧张" : "";
  const limitText = limit > 0 ? `限购 ${limit}` : "";

  return {
    activityProgressPercent: percent,
    activityProgressText: [stockText, limitText].filter(Boolean).join(" · "),
  };
}

export function buildProductCardV2Model(product: Product): ProductCardV2Model {
  const pricedProduct = product as ProductPriceFields;
  const backendActivityPrice = firstPositiveNumber(
    product.active_activity?.activity_price,
    product.activity_price,
    product.active_activity ? product.effective_price : 0,
  );
  const basePrice = Number(pricedProduct.min_price ?? product.price ?? 0);
  const price = backendActivityPrice || basePrice;
  const maxPrice = Number(pricedProduct.max_price ?? product.price ?? price);
  const hasRange = !backendActivityPrice && Number.isFinite(maxPrice) && maxPrice > price;
  const displayComparePrice = hasRange ? maxPrice : price;

  const original = firstPositiveNumber(
    pricedProduct.max_original_price,
    product.original_price,
    backendActivityPrice ? product.price : 0,
  );
  const showOriginal = Number.isFinite(original) && original > displayComparePrice;

  const stock = Number(product.default_variant?.stock ?? product.stock ?? 0);
  const soldOut = stock <= 0;

  const badges: ProductCardV2Badge[] = [];

  if (product.active_activity) {
    badges.push({
      key: "activity",
      label: activityBadgeLabel(product.active_activity.type),
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
  const activityProgress = buildActivityProgress(product);

  return {
    id: product.id,
    name: product.name,
    imageUrl: product.cover_image,
    imageAlt: product.cover_image_alt || `${product.name} 商品图片`,
    price,
    priceText: hasRange ? `${money(price)}-${money(maxPrice)}` : money(price),
    originalPrice: showOriginal ? original : undefined,
    originalPriceText: showOriginal ? money(original) : undefined,
    soldOut,
    badges: badges.slice(0, 2),
    href: `/product/${product.id}`,
    salesText,
    variantText,
    activityText,
    ...activityProgress,
    decisionTexts,
  };
}
