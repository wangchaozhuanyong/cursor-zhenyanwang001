import type { ProductListParams, ProductStatus } from "@/types/product";
import { DEFAULT_PRODUCT_LIST_SORT, PRODUCT_SORT_LABELS } from "@/utils/adminProductSort";

export type ProductStockFilter = "" | NonNullable<ProductListParams["stock_status"]>;
export type ProductCostFilter = "" | NonNullable<ProductListParams["cost_status"]>;
export type ProductMediaFilter = "" | NonNullable<ProductListParams["media_status"]>;
export type ProductMediaRepairScope = "" | "home";
export type ProductSortValue = NonNullable<ProductListParams["sort"]>;

export type AdminProductsViewState = {
  page: number;
  search: string;
  statusFilter: "" | ProductStatus;
  stockFilter: ProductStockFilter;
  costFilter: ProductCostFilter;
  mediaFilter: ProductMediaFilter;
  sort: ProductSortValue;
};

export const ADMIN_PRODUCTS_VIEW_STATE_KEY = "admin.products.viewState.v1";

export const DEFAULT_ADMIN_PRODUCTS_VIEW_STATE: AdminProductsViewState = {
  page: 1,
  search: "",
  statusFilter: "",
  stockFilter: "",
  costFilter: "",
  mediaFilter: "",
  sort: DEFAULT_PRODUCT_LIST_SORT,
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanPage(value: unknown) {
  const page = Number(value);
  return Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1;
}

function isProductStatus(value: unknown): value is ProductStatus {
  return value === "active" || value === "draft" || value === "inactive";
}

function isStockFilter(value: unknown): value is ProductStockFilter {
  return value === "" || value === "normal" || value === "low" || value === "out";
}

function isCostFilter(value: unknown): value is ProductCostFilter {
  return value === "" || value === "normal" || value === "missing";
}

function isMediaFilter(value: unknown): value is ProductMediaFilter {
  return value === "" || value === "normal" || value === "missing";
}

function isProductSortValue(value: unknown): value is ProductSortValue {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PRODUCT_SORT_LABELS, value);
}

export function normalizeAdminProductsViewState(
  value: Partial<AdminProductsViewState> | undefined,
): AdminProductsViewState {
  if (!value) return DEFAULT_ADMIN_PRODUCTS_VIEW_STATE;
  return {
    page: cleanPage(value.page),
    search: cleanText(value.search),
    statusFilter: value.statusFilter === "" || isProductStatus(value.statusFilter) ? value.statusFilter : "",
    stockFilter: isStockFilter(value.stockFilter) ? value.stockFilter : "",
    costFilter: isCostFilter(value.costFilter) ? value.costFilter : "",
    mediaFilter: isMediaFilter(value.mediaFilter) ? value.mediaFilter : "",
    sort: isProductSortValue(value.sort) ? value.sort : DEFAULT_PRODUCT_LIST_SORT,
  };
}

export function readAdminProductsViewState(): AdminProductsViewState {
  if (typeof window === "undefined") return DEFAULT_ADMIN_PRODUCTS_VIEW_STATE;

  try {
    const raw = window.sessionStorage.getItem(ADMIN_PRODUCTS_VIEW_STATE_KEY);
    if (!raw) return DEFAULT_ADMIN_PRODUCTS_VIEW_STATE;
    return normalizeAdminProductsViewState(JSON.parse(raw) as Partial<AdminProductsViewState>);
  } catch {
    return DEFAULT_ADMIN_PRODUCTS_VIEW_STATE;
  }
}

export function writeAdminProductsViewState(value: AdminProductsViewState) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ADMIN_PRODUCTS_VIEW_STATE_KEY, JSON.stringify(normalizeAdminProductsViewState(value)));
  } catch {
    // sessionStorage can be unavailable in private or embedded contexts.
  }
}

export function readProductMediaFilterFromSearch(search: string): ProductMediaFilter {
  try {
    const value = new URLSearchParams(search).get("media_status");
    return value === "normal" || value === "missing" ? value : "";
  } catch {
    return "";
  }
}

export function readProductMediaRepairScopeFromSearch(search: string): ProductMediaRepairScope {
  try {
    return new URLSearchParams(search).get("repair_scope") === "home" ? "home" : "";
  } catch {
    return "";
  }
}

export function sortProductsByRepairPriority<T extends { id: string }>(
  products: T[],
  priorityIds: string[],
): T[] {
  if (!products.length || !priorityIds.length) return products;
  const priorityById = new Map(priorityIds.map((id, index) => [id, index]));
  return [...products].sort((left, right) => {
    const leftPriority = priorityById.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightPriority = priorityById.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    return leftPriority - rightPriority;
  });
}
