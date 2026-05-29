import { get, post, del } from "@/api/request";
import type { PaginatedData } from "@/types/common";
import type { Product } from "@/types/product";

const SILENT_AUTH_OPTIONS = { skipAuthRetry: true, suppressAuthExpired: true } as const;

export function getFavorites(page = 1, pageSize = 50) {
  return get<PaginatedData<Product>>(
    "/favorites",
    { page: String(page), pageSize: String(pageSize) },
    SILENT_AUTH_OPTIONS,
  );
}

export function addFavorite(product_id: string) {
  return post<{ id: string }>("/favorites", { product_id });
}

export function removeFavorite(productId: string) {
  return del<void>(`/favorites/${productId}`);
}

export function checkFavorite(productId: string) {
  return get<{ isFavorited: boolean }>(`/favorites/${productId}/check`);
}

