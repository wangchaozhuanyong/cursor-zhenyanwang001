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

const HOME_DATA_TTL_MS = 60_000;
const PRODUCT_LIST_TTL_MS = 60_000;
const PRODUCT_DETAIL_TTL_MS = 120_000;
const CATEGORY_TTL_MS = 300_000;
const CATEGORY_CACHE_KEY = "store_categories_cache_v1";
const PRODUCT_LIST_CACHE_MAX = 24;
const PRODUCT_DETAIL_CACHE_MAX = 48;
let productListRequestSeq = 0;
let categoryRequest: Promise<Category[]> | null = null;

/** 有上限的 Map 缓存：写入时淘汰最旧条目，避免筛选/详情浏览导致内存持续增长 */
function setBoundedMapEntry<K, V>(map: Map<K, V>, key: K, value: V, maxEntries: number) {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  while (map.size > maxEntries) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
}

type ProductListCacheEntry = {
  data: {
    products: Product[];
    pagination: PaginationState;
  };
  cachedAt: number;
};

const productListCache = new Map<string, ProductListCacheEntry>();
const productDetailCache = new Map<string, { product: Product; relatedProducts: Product[]; cachedAt: number }>();
const productListRequestCache = new Map<string, Promise<Awaited<ReturnType<typeof productService.fetchProducts>>>>();
let categoriesCachedAt = 0;

function buildProductListCacheKey(params: ProductListParams) {
  return JSON.stringify(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

function isFresh(cachedAt: number, ttl: number) {
  return cachedAt > 0 && Date.now() - cachedAt < ttl;
}

function sanitizeCategoryCache(value: unknown): Category[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Category => (
    Boolean(item)
    && typeof item === "object"
    && typeof (item as Category).id === "string"
    && typeof (item as Category).name === "string"
  ));
}

function readCategoryCache(): { items: Category[]; cachedAt: number } {
  if (typeof window === "undefined") return { items: [], cachedAt: 0 };
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(CATEGORY_CACHE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return { items: [], cachedAt: 0 };
    const cachedAt = Number((parsed as { cachedAt?: unknown }).cachedAt || 0);
    if (!isFresh(cachedAt, CATEGORY_TTL_MS)) return { items: [], cachedAt: 0 };
    return {
      items: sanitizeCategoryCache((parsed as { items?: unknown }).items),
      cachedAt,
    };
  } catch {
    return { items: [], cachedAt: 0 };
  }
}

function writeCategoryCache(items: Category[]) {
  if (typeof window === "undefined" || items.length === 0) return;
  try {
    window.sessionStorage.setItem(CATEGORY_CACHE_KEY, JSON.stringify({
      cachedAt: Date.now(),
      items,
    }));
  } catch {
    // ignore storage quota/privacy failures
  }
}

const initialCategoryCache = readCategoryCache();
categoriesCachedAt = initialCategoryCache.cachedAt;

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

  /** 当前列表区展示的 cacheKey，与 filters 对应 */
  currentListCacheKey: string | null;

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

  categories: initialCategoryCache.items,

  currentListCacheKey: null,

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
    const cacheKey = buildProductListCacheKey(merged);
    const cached = productListCache.get(cacheKey);
    const hasFreshCache = Boolean(cached && isFresh(cached.cachedAt, PRODUCT_LIST_TTL_MS));
    const hasStaleCache = Boolean(cached && !hasFreshCache);
    const state = get();

    if (hasFreshCache && cached) {
      set({
        products: cached.data.products,
        pagination: cached.data.pagination,
        loading: false,
        listRefreshing: false,
        error: null,
        filters: merged,
        currentListCacheKey: cacheKey,
      });
      return;
    }

    if (hasStaleCache && cached) {
      set({
        products: cached.data.products,
        pagination: cached.data.pagination,
        loading: false,
        listRefreshing: true,
        error: null,
        filters: merged,
        currentListCacheKey: cacheKey,
      });
    } else if (state.products.length > 0) {
      // Intentionally keep the current visible list while an uncached category/search request is in flight.
      // Clearing here remounts product images and brings back the storefront image reload flicker.
      set({
        loading: false,
        listRefreshing: true,
        error: null,
        filters: merged,
        currentListCacheKey: cacheKey,
      });
    } else {
      set({
        products: [],
        pagination: INITIAL_PAGINATION,
        loading: true,
        listRefreshing: false,
        error: null,
        filters: merged,
        currentListCacheKey: cacheKey,
      });
    }

    try {
      let request = productListRequestCache.get(cacheKey);
      if (!request) {
        request = productService.fetchProducts(merged).finally(() => {
          productListRequestCache.delete(cacheKey);
        });
        productListRequestCache.set(cacheKey, request);
      }
      const data = await request;
      if (requestSeq !== productListRequestSeq) return;
      const pagination = {
        total: data.total,
        page: data.page,
        pageSize: data.pageSize,
        totalPages: data.totalPages,
      };
      setBoundedMapEntry(productListCache, cacheKey, {
        data: {
          products: data.list,
          pagination,
        },
        cachedAt: Date.now(),
      }, PRODUCT_LIST_CACHE_MAX);
      set({
        products: data.list,
        pagination,
        loading: false,
        listRefreshing: false,
        currentListCacheKey: cacheKey,
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
    const cached = productDetailCache.get(id);
    if (cached && isFresh(cached.cachedAt, PRODUCT_DETAIL_TTL_MS)) {
      set({
        currentProduct: cached.product,
        relatedProducts: cached.relatedProducts,
        detailLoading: false,
        error: null,
      });
    } else {
      set({ detailLoading: true, error: null, currentProduct: null, relatedProducts: [] });
    }

    try {
      const product = await productService.fetchProductById(id);
      if (!product) {
        set({ detailLoading: false, error: "商品不存在" });
        return;
      }

      const related = await productService.fetchRelatedProducts(product);
      setBoundedMapEntry(
        productDetailCache,
        id,
        { product, relatedProducts: related, cachedAt: Date.now() },
        PRODUCT_DETAIL_CACHE_MAX,
      );
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
      if (cats.length > 0) {
        categoriesCachedAt = Date.now();
        writeCategoryCache(cats);
      }
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "加载首页数据失败",
      });
    }
  },

  loadCategories: async () => {
    if (get().categories.length > 0 && isFresh(categoriesCachedAt, CATEGORY_TTL_MS)) return;

    try {
      if (!categoryRequest) {
        categoryRequest = productService.fetchCategories().finally(() => {
          categoryRequest = null;
        });
      }
      const cats = await categoryRequest;
      categoriesCachedAt = Date.now();
      writeCategoryCache(cats);
      set({ categories: cats });
    } catch {
      // 分类加载失败不阻断商品列表；保留已有分类缓存
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

export function invalidatePublicProductStoreCache(options?: {
  categories?: boolean;
  home?: boolean;
  productId?: string;
  products?: boolean;
}) {
  const invalidateProducts = options?.products !== false;
  const invalidateCategories = options?.categories === true;
  const invalidateHome = options?.home !== false;

  if (invalidateProducts) {
    productListRequestSeq += 1;
    productListCache.clear();
    productListRequestCache.clear();
    if (options?.productId) {
      productDetailCache.delete(options.productId);
    } else {
      productDetailCache.clear();
    }
  }

  if (invalidateCategories) {
    categoriesCachedAt = 0;
    categoryRequest = null;
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(CATEGORY_CACHE_KEY);
      } catch {
        // Ignore storage failures; in-memory cache is already cleared.
      }
    }
  }

  if (invalidateHome) {
    homeService.invalidateHomeBootstrapCache();
  }

  useProductStore.setState((state) => ({
    currentListCacheKey: invalidateProducts ? null : state.currentListCacheKey,
    homeDataLoadedAt: invalidateHome ? 0 : state.homeDataLoadedAt,
  }));
}
