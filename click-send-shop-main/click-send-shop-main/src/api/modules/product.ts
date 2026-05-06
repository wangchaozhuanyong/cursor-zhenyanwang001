import { get } from "../request";
import type { Product, ProductListParams, ProductReview } from "@/types/product";
import type { PaginatedData } from "@/types/common";

export function getProducts(params?: ProductListParams) {
  return get<PaginatedData<Product>>("/products", params as Record<string, unknown>);
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

export function getProductReviews(productId: string, page = 1) {
  // 后端 reviews 独立资源：GET /api/reviews/product/:productId
  return get<PaginatedData<ProductReview>>(`/reviews/product/${productId}`, { page });
}
