import * as favoritesApi from "@/api/modules/favorites";
import type { PaginatedData } from "@/types/common";
import type { Product } from "@/types/product";

export async function fetchFavorites(page = 1, pageSize = 50) {
  const res = await favoritesApi.getFavorites(page, pageSize);
  return res.data as PaginatedData<Product>;
}

export async function addFavoriteProduct(productId: string) {
  return favoritesApi.addFavorite(productId);
}

export async function removeFavoriteProduct(productId: string) {
  return favoritesApi.removeFavorite(productId);
}
