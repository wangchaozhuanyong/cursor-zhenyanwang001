import { create } from "zustand";
import type { Product, ProductListParams } from "@/types/product";
import type { Category } from "@/types/category";
import * as productService from "@/services/productService";
import * as homeService from "@/services/homeService";

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

const HOME_DATA_TTL_MS = 120_000;
let productListRequestSeq = 0;

interface ProductState {
  products: Product[];
  pagination: PaginationState;
  filters: ProductListParams;

  currentProduct: Product | null;
  relatedProducts: Product[];

  hotProducts: Product[];
  newProducts: Product[];
  recommendedProducts: Product[];
  homeDataLoadedAt: number;

  categories: Category[];

  loading: boolean;
  listRefreshing: boolean;
  detailLoading: boolean;
  error: string | null;

  loadProducts: (params?: Partial<ProductListParams>) => Promise<void>;
  loadProductDetail: (id: string) => Promise<void>;
  loadHomeData: (options?: { force?: boolean; background?: boolean }) => Promise<void>;
  loadCategories: () => Promise<void>;
  setFilters: (patch: Partial<ProductListParams>) => Promise<void>;
  resetFilters: () => Promise<void>;
  clearError: () => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  pagination: INITIAL_PAGINATION,
  filters: { ...INITIAL_FILTERS },

  currentProduct: null,
  relatedProducts: [],

  hotProducts: [],
  newProducts: [],
  recommendedProducts: [],
  homeDataLoadedAt: 0,

  categories: [],

  loading: false,
  listRefreshing: false,
  detailLoading: false,
  error: null,

  loadProducts: async (params) => {
    const requestSeq = ++productListRequestSeq;
    const merged: ProductListParams = {
      ...get().filters,
      ...params,
    };

    const hasData = get().products.length > 0;
    set({
      loading: !hasData,
      listRefreshing: hasData,
      error: null,
      filters: merged,
    });

    try {
      const data = await productService.fetchProducts(merged);
      if (requestSeq !== productListRequestSeq) return;
      set({
        products: data.list,
        pagination: {
          total: data.total,
          page: data.page,
          pageSize: data.pageSize,
          totalPages: data.totalPages,
        },
        loading: false,
        listRefreshing: false,
      });
    } catch (err) {
      if (requestSeq !== productListRequestSeq) return;
      set({
        loading: false,
        listRefreshing: false,
        error: err instanceof Error ? err.message : "加载商品失败",
      });
    }
  },

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

  loadHomeData: async (options) => {
    const force = options?.force === true;
    const background = options?.background === true;
    const state = get();
    const hasHomeData =
      state.hotProducts.length > 0 || state.newProducts.length > 0 || state.recommendedProducts.length > 0;
    const isFresh = hasHomeData && Date.now() - state.homeDataLoadedAt < HOME_DATA_TTL_MS;

    if (!force && isFresh) return;

    if (!background) {
      set({ loading: !hasHomeData, error: null });
    }

    try {
      let homeData: { hot: Product[]; new_arrivals: Product[]; recommended: Product[] };
      let cats: Category[];
      try {
        const bootstrap = await homeService.fetchHomeBootstrap();
        homeData = {
          hot: Array.isArray(bootstrap?.products?.hot) ? bootstrap.products.hot : [],
          new_arrivals: Array.isArray(bootstrap?.products?.new_arrivals) ? bootstrap.products.new_arrivals : [],
          recommended: Array.isArray(bootstrap?.products?.recommended) ? bootstrap.products.recommended : [],
        };
        cats = Array.isArray(bootstrap?.categories) ? bootstrap.categories : state.categories;
      } catch {
        const fallback = await Promise.all([
          productService.fetchHomeProducts(),
          state.categories.length > 0 ? Promise.resolve(state.categories) : productService.fetchCategories(),
        ]);
        homeData = fallback[0];
        cats = fallback[1];
      }

      set({
        hotProducts: homeData.hot,
        newProducts: homeData.new_arrivals,
        recommendedProducts: homeData.recommended,
        categories: cats,
        homeDataLoadedAt: Date.now(),
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "加载首页数据失败",
      });
    }
  },

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

  setFilters: async (patch) => {
    const next: ProductListParams = {
      ...get().filters,
      ...patch,
      page: patch.page ?? 1,
    };
    await get().loadProducts(next);
  },

  resetFilters: async () => {
    await get().loadProducts({ ...INITIAL_FILTERS });
  },

  clearError: () => set({ error: null }),
}));

