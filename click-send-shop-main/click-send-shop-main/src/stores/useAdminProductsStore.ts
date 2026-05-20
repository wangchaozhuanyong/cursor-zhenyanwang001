import { create } from "zustand";
import type { Product, ProductLifecycleStatus, ProductListParams, ProductStatus } from "@/types/product";
import * as productService from "@/services/admin/productService";

const initialState = {
  products: [] as Product[],
  loading: true,
  search: "",
  selected: [] as string[],
  total: 0,
  page: 1,
  pageSize: 20,
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
  total: number;
  page: number;
  pageSize: number;

  setSearch: (v: string) => void;
  loadProducts: (params?: ProductListParams) => Promise<void>;
  toggleSelect: (id: string) => void;
  /** 与原先表格「全选当前页」一致 */
  togglePageSelection: (pageIds: string[]) => void;
  clearSelected: () => void;
  applyProductStatus: (id: string, status: ProductStatus) => void;
  applyStatusToIds: (ids: string[], status: ProductStatus) => void;
  replaceProducts: (list: Product[]) => void;
  /** 软删除后从本地列表移除并清理多选 */
  removeProductsByIds: (ids: string[]) => void;
  reset: () => void;
}

export const useAdminProductsStore = create<AdminProductsState>((set, get) => ({
  ...initialState,

  setSearch: (search) => set({ search }),

  reset: () => set({ ...initialState }),

  loadProducts: async (params = {}) => {
    set({ loading: true });
    try {
      const p = await productService.fetchProducts(params);
      set({
        products: p.list as Product[],
        total: Number(p.total || 0),
        page: Number(p.page || params.page || 1),
        pageSize: Number(p.pageSize || params.pageSize || 20),
        loading: false,
      });
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
    const lifecycle_status = (status === "active" ? 1 : status === "draft" ? 0 : 2) as ProductLifecycleStatus;
    set((s) => ({
      products: s.products.map((p) => (p.id === id ? { ...p, status, lifecycle_status } : p)),
    }));
  },

  applyStatusToIds: (ids, status) => {
    const idSet = new Set(ids);
    const lifecycle_status = (status === "active" ? 1 : status === "draft" ? 0 : 2) as ProductLifecycleStatus;
    set((s) => ({
      products: s.products.map((p) => (idSet.has(p.id) ? { ...p, status, lifecycle_status } : p)),
      selected: [],
    }));
  },

  replaceProducts: (products) => set({ products }),

  removeProductsByIds: (ids) => {
    const idSet = new Set(ids);
    set((s) => ({
      products: s.products.filter((p) => !idSet.has(p.id)),
      selected: s.selected.filter((id) => !idSet.has(id)),
    }));
  },

}));
