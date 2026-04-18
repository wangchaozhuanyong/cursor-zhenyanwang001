import { create } from "zustand";
import type { Product, ProductStatus } from "@/types/product";
import * as productService from "@/services/admin/productService";

const initialState = {
  products: [] as Product[],
  loading: true,
  search: "",
  selected: [] as string[],
};

/**
 * 管理后台「商品列表」：列表、搜索、多选、本地状态同步。
 * 不内置 toast；导入/导出仍由 Page 调 Service。
 */
interface AdminProductsState {
  products: Product[];
  loading: boolean;
  search: string;
  selected: string[];

  setSearch: (v: string) => void;
  loadProducts: () => Promise<void>;
  toggleSelect: (id: string) => void;
  /** 与原先表格「全选当前页」一致 */
  togglePageSelection: (pageIds: string[]) => void;
  clearSelected: () => void;
  applyProductStatus: (id: string, status: ProductStatus) => void;
  applyStatusToIds: (ids: string[], status: ProductStatus) => void;
  replaceProducts: (list: Product[]) => void;
  reset: () => void;
}

export const useAdminProductsStore = create<AdminProductsState>((set, get) => ({
  ...initialState,

  setSearch: (search) => set({ search }),

  reset: () => set({ ...initialState }),

  loadProducts: async () => {
    set({ loading: true });
    try {
      const p = await productService.fetchProducts();
      set({ products: p.list as Product[], loading: false });
    } catch {
      set({ loading: false });
      throw new Error("LOAD_ADMIN_PRODUCTS_FAILED");
    }
  },

  toggleSelect: (id) => {
    set((s) => ({
      selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id],
    }));
  },

  togglePageSelection: (pageIds) => {
    set((s) => {
      const allOnPage = pageIds.length > 0 && pageIds.every((id) => s.selected.includes(id));
      if (allOnPage) {
        return { selected: s.selected.filter((id) => !pageIds.includes(id)) };
      }
      return { selected: pageIds };
    });
  },

  clearSelected: () => set({ selected: [] }),

  applyProductStatus: (id, status) => {
    set((s) => ({
      products: s.products.map((p) => (p.id === id ? { ...p, status } : p)),
    }));
  },

  applyStatusToIds: (ids, status) => {
    const idSet = new Set(ids);
    set((s) => ({
      products: s.products.map((p) => (idSet.has(p.id) ? { ...p, status } : p)),
      selected: [],
    }));
  },

  replaceProducts: (products) => set({ products }),

}));
