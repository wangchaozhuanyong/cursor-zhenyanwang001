import { create } from "zustand";
import type { Product, ProductListParams } from "@/types/product";
import type { Category } from "@/types/category";
import * as productService from "@/services/productService";

// ─── Sub-State Types ────────────────────────────────────

interface PaginationState {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const INITIAL_PAGINATION: PaginationState = {
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
};

const INITIAL_FILTERS: ProductListParams = {
  category_id: undefined,
  keyword: undefined,
  sort: undefined,
  page: 1,
  pageSize: 10,
};

// ─── Store Interface ────────────────────────────────────

interface ProductState {
  // 商品列表
  products: Product[];
  pagination: PaginationState;
  filters: ProductListParams;

  // 商品详情
  currentProduct: Product | null;
  relatedProducts: Product[];

  // 首页版块
  hotProducts: Product[];
  newProducts: Product[];
  recommendedProducts: Product[];

  // 分类
  categories: Category[];

  // UI 状态
  loading: boolean;
  detailLoading: boolean;
  error: string | null;

  // ─── Actions ──────────────────────────────────────────

  /** 加载商品列表（带筛选 / 排序 / 分页） */
  loadProducts: (params?: Partial<ProductListParams>) => Promise<void>;

  /** 加载商品详情 + 相关推荐 */
  loadProductDetail: (id: string) => Promise<void>;

  /** 加载首页数据（热门 / 新品 / 推荐 + 分类） */
  loadHomeData: () => Promise<void>;

  /** 加载分类列表 */
  loadCategories: () => Promise<void>;

  /** 合并更新筛选条件，自动重新加载列表 */
  setFilters: (patch: Partial<ProductListParams>) => Promise<void>;

  /** 重置筛选条件并重新加载 */
  resetFilters: () => Promise<void>;

  /** 清除错误 */
  clearError: () => void;
}

// ─── Store Implementation ───────────────────────────────

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  pagination: INITIAL_PAGINATION,
  filters: { ...INITIAL_FILTERS },

  currentProduct: null,
  relatedProducts: [],

  hotProducts: [],
  newProducts: [],
  recommendedProducts: [],

  categories: [],

  loading: false,
  detailLoading: false,
  error: null,

  // ── loadProducts ──────────────────────────────────────

  loadProducts: async (params) => {
    const merged: ProductListParams = {
      ...get().filters,
      ...params,
    };
    set({ loading: true, error: null, filters: merged });

    try {
      const data = await productService.fetchProducts(merged);
      set({
        products: data.list,
        pagination: {
          total: data.total,
          page: data.page,
          pageSize: data.pageSize,
          totalPages: data.totalPages,
        },
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "加载商品失败",
      });
    }
  },

  // ── loadProductDetail ─────────────────────────────────

  loadProductDetail: async (id) => {
    set({ detailLoading: true, error: null, currentProduct: null, relatedProducts: [] });

    try {
      const product = await productService.fetchProductById(id);
      if (!product) {
        set({ detailLoading: false, error: "商品不存在" });
        return;
      }

      const related = await productService.fetchRelatedProducts(product);
      set({
        currentProduct: product,
        relatedProducts: related,
        detailLoading: false,
      });
    } catch (err) {
      set({
        detailLoading: false,
        error: err instanceof Error ? err.message : "加载商品详情失败",
      });
    }
  },

  // ── loadHomeData ──────────────────────────────────────

  loadHomeData: async () => {
    set({ loading: true, error: null });

    try {
      const [homeData, cats] = await Promise.all([
        productService.fetchHomeProducts(),
        productService.fetchCategories(),
      ]);

      set({
        hotProducts: homeData.hot,
        newProducts: homeData.new_arrivals,
        recommendedProducts: homeData.recommended,
        categories: cats,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "加载首页数据失败",
      });
    }
  },

  // ── loadCategories ────────────────────────────────────

  loadCategories: async () => {
    if (get().categories.length > 0) return;

    try {
      const cats = await productService.fetchCategories();
      set({ categories: cats });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "加载分类失败",
      });
    }
  },

  // ── setFilters ────────────────────────────────────────

  setFilters: async (patch) => {
    const next: ProductListParams = {
      ...get().filters,
      ...patch,
      page: patch.page ?? 1,
    };
    await get().loadProducts(next);
  },

  // ── resetFilters ──────────────────────────────────────

  resetFilters: async () => {
    await get().loadProducts({ ...INITIAL_FILTERS });
  },

  // ── clearError ────────────────────────────────────────

  clearError: () => set({ error: null }),
}));
