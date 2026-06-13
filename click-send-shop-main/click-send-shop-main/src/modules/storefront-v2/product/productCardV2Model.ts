import { isProductNewArrival } from "@/utils/productNewArrival";
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
};

type ProductPriceFields = Product & {
  min_price?: number | null;
  max_price?: number | null;
  max_original_price?: number | null;
};

export function money(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(2).replace(/\.00$/, "");
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
    badges.push({
      key: "activity",
      label: product.active_activity.type === "flash_sale" ? "秒杀" : "满减",
      tone: "sale",
    });
  }

  if (product.is_hot) {
    badges.push({ key: "hot", label: "热销", tone: "hot" });
  }

  if (isProductNewArrival(product)) {
    badges.push({ key: "new", label: "新品", tone: "new" });
  }

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
  };
}
