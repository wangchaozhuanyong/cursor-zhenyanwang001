import { beforeEach, describe, expect, test, vi } from "vitest";
import * as productService from "@/services/productService";
import { invalidatePublicProductStoreCache, useProductStore } from "@/stores/useProductStore";
import type { Product } from "@/types/product";
import type { PaginatedData } from "@/types/common";

vi.mock("@/services/productService", () => ({
  fetchProducts: vi.fn(),
  fetchProductById: vi.fn(),
  fetchRelatedProducts: vi.fn(),
  fetchHomeProducts: vi.fn(),
  fetchCategories: vi.fn(),
  fetchProductTags: vi.fn(),
}));

vi.mock("@/services/homeService", () => ({
  fetchHomeBootstrap: vi.fn(),
  invalidateHomeBootstrapCache: vi.fn(),
}));

const product = (id: string): Product => ({
  id,
  name: `Product ${id}`,
  price: 10,
  points: 0,
  cover_image: "",
  images: [],
  category_id: "cat",
  stock: 5,
  status: "active",
  sort_order: 0,
  description: "",
  is_recommended: false,
  is_new: false,
  is_hot: false,
});

function page(list: Product[]): PaginatedData<Product> {
  return {
    list,
    total: list.length,
    page: 1,
    pageSize: 24,
    totalPages: list.length > 0 ? 1 : 0,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

describe("useProductStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidatePublicProductStoreCache({ categories: true, home: true, products: true });
    useProductStore.setState({
      products: [],
      pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
      filters: { page: 1, pageSize: 10 },
      currentProduct: null,
      relatedProducts: [],
      hotProducts: [],
      newProducts: [],
      recommendedProducts: [],
      homeDataLoadedAt: 0,
      categories: [],
      currentListCacheKey: null,
      loading: false,
      listRefreshing: false,
      detailLoading: false,
      error: null,
    });
  });

  test("keeps current product list visible while loading an uncached list", async () => {
    vi.mocked(productService.fetchProducts).mockResolvedValueOnce(page([product("old")]));

    await useProductStore.getState().loadProducts({ category_id: "old", page: 1, pageSize: 24 });

    const nextPage = deferred<PaginatedData<Product>>();
    vi.mocked(productService.fetchProducts).mockReturnValueOnce(nextPage.promise);

    const pending = useProductStore.getState().loadProducts({ category_id: "new", page: 1, pageSize: 24 });

    expect(useProductStore.getState().products.map((item) => item.id)).toEqual(["old"]);
    expect(useProductStore.getState().loading).toBe(false);
    expect(useProductStore.getState().listRefreshing).toBe(true);

    nextPage.resolve(page([product("new")]));
    await pending;

    expect(useProductStore.getState().products.map((item) => item.id)).toEqual(["new"]);
    expect(useProductStore.getState().listRefreshing).toBe(false);
  });
});
