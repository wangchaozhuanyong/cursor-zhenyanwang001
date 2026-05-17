import { get, post } from "@/api/request";
import type { Product, ProductListParams, ProductReview, ProductTag } from "@/types/product";
import type { PaginatedData } from "@/types/common";

export function getProducts(params?: ProductListParams) {
  return get<PaginatedData<Product>>("/products", params as unknown as Record<string, unknown>);
}

export function getProductById(id: string) {
  return get<Product>(`/products/${id}`);
}

export function getRelatedProducts(productId: string, limit = 4) {
  return get<Product[]>(`/products/${productId}/related`, { limit });
}

export function getHomeProducts() {
  return get<{ hot: Product[]; new_arrivals: Product[]; recommended: Product[] }>(
    "/products/home",
  );
}

export function getProductTags(limit = 12) {
  return get<ProductTag[]>("/products/tags", { limit });
}

export function getProductReviews(productId: string, page = 1) {
  // 鍚庣 reviews 鐙珛璧勬簮锛欸ET /api/reviews/product/:productId
  return get<PaginatedData<ProductReview>>(`/reviews/product/${productId}`, { page });
}

export function trackHomeEvent(data: {
  module: "new_arrivals";
  event: "impression" | "click";
  product_id?: string;
  session_id?: string;
  meta?: Record<string, unknown>;
}) {
  return post<null>("/products/home/events", data);
}

