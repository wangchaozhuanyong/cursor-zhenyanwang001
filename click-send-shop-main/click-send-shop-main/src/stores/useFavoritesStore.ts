import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isLoggedIn } from "@/utils/token";
import * as favoritesService from "@/services/favoritesService";

export interface FavoriteProduct {
  id: string;
  name: string;
  cover_image: string;
  images: string[];
  price: number;
  points: number;
  category_id: string;
  stock: number;
  status: string;
  sort_order: number;
  description: string;
  is_recommended: boolean;
  is_new: boolean;
  is_hot: boolean;
}

interface FavoritesStore {
  favoriteIds: string[];
  favoriteProducts: FavoriteProduct[];
  loading: boolean;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (product: FavoriteProduct) => Promise<boolean>;
  loadFavorites: () => Promise<void>;
  mergeLocalThenSync: (localIds: string[], localProducts: FavoriteProduct[]) => Promise<void>;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      favoriteProducts: [],
      loading: false,

      isFavorite: (id) => get().favoriteIds.includes(id),

      toggleFavorite: async (product) => {
        const id = product.id;
        const has = get().favoriteIds.includes(id);
        const prev = { favoriteIds: get().favoriteIds, favoriteProducts: get().favoriteProducts };
        set((s) => ({
          favoriteIds: has
            ? s.favoriteIds.filter((fid) => fid !== id)
            : [...s.favoriteIds, id],
          favoriteProducts: has
            ? s.favoriteProducts.filter((p) => p.id !== id)
            : s.favoriteProducts.some((p) => p.id === id)
              ? s.favoriteProducts
              : [product, ...s.favoriteProducts],
        }));
        if (isLoggedIn()) {
          try {
            if (has) await favoritesService.removeFavoriteProduct(id);
            else await favoritesService.addFavoriteProduct(id);
          } catch {
            set(prev);
            throw new Error("收藏操作失败，请重试");
          }
        }
        return !has;
      },

      loadFavorites: async () => {
        if (!isLoggedIn()) return;
        set({ loading: true });
        try {
          const data = await favoritesService.fetchFavorites(1, 200);
          const list = data.list || [];
          set({
            favoriteIds: list.map((p: FavoriteProduct) => p.id),
            favoriteProducts: list,
            loading: false,
          });
        } catch {
          set({ loading: false });
        }
      },

      mergeLocalThenSync: async (localIds, localProducts) => {
        if (!isLoggedIn()) return;
        await get().loadFavorites();
        const serverIds = new Set(get().favoriteIds);
        const localUniqueIds = Array.from(new Set(localIds.filter(Boolean)));
        const toAdd = localUniqueIds.filter((id) => !serverIds.has(id));
        if (toAdd.length) {
          await Promise.allSettled(toAdd.map((id) => favoritesService.addFavoriteProduct(id)));
        }
        await get().loadFavorites();
        set((s) => {
          const products = [...s.favoriteProducts];
          const ids = new Set(s.favoriteIds);
          for (const product of localProducts) {
            if (!product?.id || ids.has(product.id)) continue;
            ids.add(product.id);
            products.push(product);
          }
          return { favoriteIds: Array.from(ids), favoriteProducts: products };
        });
      },
    }),
    {
      name: "favorites-storage",
      partialize: (s) => ({ favoriteIds: s.favoriteIds, favoriteProducts: s.favoriteProducts }),
    }
  )
);
