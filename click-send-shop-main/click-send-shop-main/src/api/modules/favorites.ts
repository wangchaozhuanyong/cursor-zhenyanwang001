import { get, post, del } from "../request";
import type { PaginatedData } from "@/types/common";
import type { Product } from "@/types/product";

export function getFavorites(page = 1, pageSize = 50) {
  return get<PaginatedData<Product>>("/favorites", {
    page: String(page),
    pageSize: String(pageSize),
  });
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
