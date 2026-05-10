import type { CartItem } from "@/types/cart";
import type { Order } from "@/types/order";
import type { Product } from "@/types/product";

type ProductLike = Pick<Product, "id" | "category_id" | "price">;

interface BuildPersonalizedRecommendationsParams {
  candidates: Product[];
  historyProducts: Product[];
  favoriteIds?: string[];
  favoriteProducts: ProductLike[];
  cartItems: CartItem[];
  orders: Order[];
  fallbackProducts: Product[];
  limit?: number;
}

const RECENT_HISTORY_LIMIT = 12;
const DEFAULT_LIMIT = 16;

function addScore(map: Map<string, number>, key: string | undefined, score: number) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + score);
}

function productPrice(product: ProductLike): number | null {
  const price = Number(product.price);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function averagePrice(products: ProductLike[]): number | null {
  const prices = products.map(productPrice).filter((price): price is number => price !== null);
  if (prices.length === 0) return null;
  return prices.reduce((sum, price) => sum + price, 0) / prices.length;
}

function priceAffinityScore(candidate: Product, preferredPrice: number | null): number {
  const candidatePrice = productPrice(candidate);
  if (!candidatePrice || !preferredPrice) return 0;
  const distanceRatio = Math.abs(candidatePrice - preferredPrice) / Math.max(candidatePrice, preferredPrice);
  return Math.max(0, 18 * (1 - distanceRatio));
}

function uniqueProducts(products: Product[]): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const product of products) {
    if (!product?.id || seen.has(product.id)) continue;
    seen.add(product.id);
    out.push(product);
  }
  return out;
}

export function buildPersonalizedRecommendations({
  candidates,
  historyProducts,
  favoriteIds = [],
  favoriteProducts,
  cartItems,
  orders,
  fallbackProducts,
  limit = DEFAULT_LIMIT,
}: BuildPersonalizedRecommendationsParams): Product[] {
  const categoryScores = new Map<string, number>();
  const directSignalIds = new Set<string>();
  const cartOrPurchasedIds = new Set<string>();
  const signalProducts: ProductLike[] = [];

  historyProducts.slice(0, RECENT_HISTORY_LIMIT).forEach((product, index) => {
    const weight = Math.max(5, 26 - index * 2);
    addScore(categoryScores, product.category_id, weight);
    directSignalIds.add(product.id);
    signalProducts.push(product);
  });

  favoriteProducts.forEach((product) => {
    addScore(categoryScores, product.category_id, 34);
    directSignalIds.add(product.id);
    signalProducts.push(product);
  });
  favoriteIds.forEach((id) => directSignalIds.add(id));

  cartItems.forEach(({ product, qty }) => {
    const weight = 38 + Math.min(Math.max(qty, 1), 5) * 3;
    addScore(categoryScores, product.category_id, weight);
    directSignalIds.add(product.id);
    cartOrPurchasedIds.add(product.id);
    signalProducts.push(product);
  });

  orders.slice(0, 10).forEach((order, orderIndex) => {
    const recencyWeight = Math.max(12, 32 - orderIndex * 2);
    order.items.forEach(({ product, qty }) => {
      const paidBoost = order.payment_status === "paid" || order.status === "completed" ? 8 : 0;
      addScore(categoryScores, product.category_id, recencyWeight + paidBoost + Math.min(Math.max(qty, 1), 5) * 2);
      directSignalIds.add(product.id);
      cartOrPurchasedIds.add(product.id);
      signalProducts.push(product);
    });
  });

  const preferredPrice = averagePrice(signalProducts);
  const pool = uniqueProducts([...candidates, ...fallbackProducts]);

  const scored = pool
    .map((product, index) => {
      const categoryScore = categoryScores.get(product.category_id) || 0;
      const merchandisingScore =
        (product.is_recommended ? 28 : 0) +
        (product.is_hot ? 10 : 0) +
        (product.is_new ? 8 : 0) +
        Math.log10(Math.max(Number(product.sales_count || 0), 0) + 1) * 8;
      const freshnessScore = Math.max(0, 10 - index * 0.15);
      const exactRepeatPenalty = directSignalIds.has(product.id) ? 80 : 0;
      const score = categoryScore + merchandisingScore + priceAffinityScore(product, preferredPrice) + freshnessScore - exactRepeatPenalty;
      return { product, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const primary = scored
    .filter(({ product }) => !cartOrPurchasedIds.has(product.id) && !directSignalIds.has(product.id))
    .map(({ product }) => product);

  const fallback = scored
    .filter(({ product }) => !cartOrPurchasedIds.has(product.id))
    .map(({ product }) => product);

  return uniqueProducts([...primary, ...fallback, ...pool]).slice(0, limit);
}
