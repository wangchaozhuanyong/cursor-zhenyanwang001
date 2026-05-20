import type { Product } from "@/types/product";

const NEW_ARRIVAL_DAYS = 30;

export function isProductNewArrival(product: Product) {
  if (product.isNewArrival !== undefined) return Boolean(product.isNewArrival);
  if (product.is_new !== undefined) return Boolean(product.is_new);
  if (product.newArrival !== undefined) return Boolean(product.newArrival);

  const raw = product.publishedAt || product.published_at || product.createdAt || product.created_at;
  if (!raw) return false;
  const time = new Date(raw).getTime();
  if (!Number.isFinite(time)) return false;
  return Date.now() - time <= NEW_ARRIVAL_DAYS * 24 * 60 * 60 * 1000;
}
