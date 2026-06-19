import type { OrderStatus, PaymentStatus } from "@/types/order";

export type OrderReturnStatusFilter = "" | "none" | "active" | "any";
export type OrderBinaryFilter = "" | "1" | "0";
export type OrderCostStatusFilter = "" | "normal" | "missing";
export type OrderBuyerTypeFilter = "" | "new" | "repeat";

export type AdminOrdersViewState = {
  advancedFiltersOpen: boolean;
  statusFilter: "" | OrderStatus;
  paymentFilter: "" | PaymentStatus;
  search: string;
  dateFrom: string;
  dateTo: string;
  paymentMethod: string;
  paymentChannel: string;
  shippingName: string;
  returnStatus: OrderReturnStatusFilter;
  refundStatus: string;
  hasNote: OrderBinaryFilter;
  costStatus: OrderCostStatusFilter;
  overduePayment: OrderBinaryFilter;
  overdueShipment: OrderBinaryFilter;
  buyerType: OrderBuyerTypeFilter;
  amountMin: string;
  amountMax: string;
  page: number;
  pageSize: number;
};

export const ADMIN_ORDERS_VIEW_STATE_KEY = "admin.orders.viewState.v1";
export const ADMIN_ORDERS_PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50, 100] as const;

export const DEFAULT_ADMIN_ORDERS_VIEW_STATE: AdminOrdersViewState = {
  advancedFiltersOpen: false,
  statusFilter: "",
  paymentFilter: "",
  search: "",
  dateFrom: "",
  dateTo: "",
  paymentMethod: "",
  paymentChannel: "",
  shippingName: "",
  returnStatus: "",
  refundStatus: "",
  hasNote: "",
  costStatus: "",
  overduePayment: "",
  overdueShipment: "",
  buyerType: "",
  amountMin: "",
  amountMax: "",
  page: 1,
  pageSize: 30,
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanFreeText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function cleanPage(value: unknown) {
  const page = Number(value);
  return Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1;
}

function cleanPageSize(value: unknown) {
  const pageSize = Number(value);
  return ADMIN_ORDERS_PAGE_SIZE_OPTIONS.includes(pageSize as (typeof ADMIN_ORDERS_PAGE_SIZE_OPTIONS)[number])
    ? pageSize
    : DEFAULT_ADMIN_ORDERS_VIEW_STATE.pageSize;
}

function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    value === "pending"
    || value === "paid"
    || value === "shipped"
    || value === "completed"
    || value === "cancelled"
    || value === "refunding"
    || value === "refunded"
  );
}

function isPaymentStatus(value: unknown): value is PaymentStatus {
  return (
    value === "pending"
    || value === "paid"
    || value === "failed"
    || value === "refunded"
    || value === "partially_refunded"
  );
}

function isReturnStatus(value: unknown): value is OrderReturnStatusFilter {
  return value === "" || value === "none" || value === "active" || value === "any";
}

function isBinaryFilter(value: unknown): value is OrderBinaryFilter {
  return value === "" || value === "1" || value === "0";
}

function isCostStatus(value: unknown): value is OrderCostStatusFilter {
  return value === "" || value === "normal" || value === "missing";
}

function isBuyerType(value: unknown): value is OrderBuyerTypeFilter {
  return value === "" || value === "new" || value === "repeat";
}

export function normalizeAdminOrdersViewState(
  value: Partial<AdminOrdersViewState> | undefined,
): AdminOrdersViewState {
  if (!value) return DEFAULT_ADMIN_ORDERS_VIEW_STATE;
  return {
    advancedFiltersOpen: Boolean(value.advancedFiltersOpen),
    statusFilter: value.statusFilter === "" || isOrderStatus(value.statusFilter) ? value.statusFilter : "",
    paymentFilter: value.paymentFilter === "" || isPaymentStatus(value.paymentFilter) ? value.paymentFilter : "",
    search: cleanText(value.search),
    dateFrom: cleanText(value.dateFrom),
    dateTo: cleanText(value.dateTo),
    paymentMethod: cleanFreeText(value.paymentMethod),
    paymentChannel: cleanFreeText(value.paymentChannel),
    shippingName: cleanFreeText(value.shippingName),
    returnStatus: isReturnStatus(value.returnStatus) ? value.returnStatus : "",
    refundStatus: cleanFreeText(value.refundStatus),
    hasNote: isBinaryFilter(value.hasNote) ? value.hasNote : "",
    costStatus: isCostStatus(value.costStatus) ? value.costStatus : "",
    overduePayment: isBinaryFilter(value.overduePayment) ? value.overduePayment : "",
    overdueShipment: isBinaryFilter(value.overdueShipment) ? value.overdueShipment : "",
    buyerType: isBuyerType(value.buyerType) ? value.buyerType : "",
    amountMin: cleanText(value.amountMin),
    amountMax: cleanText(value.amountMax),
    page: cleanPage(value.page),
    pageSize: cleanPageSize(value.pageSize),
  };
}

export function readAdminOrdersViewState(
  override?: Partial<AdminOrdersViewState>,
): AdminOrdersViewState {
  if (typeof window === "undefined") {
    return normalizeAdminOrdersViewState({ ...DEFAULT_ADMIN_ORDERS_VIEW_STATE, ...override });
  }

  try {
    const raw = window.sessionStorage.getItem(ADMIN_ORDERS_VIEW_STATE_KEY);
    const saved = raw ? normalizeAdminOrdersViewState(JSON.parse(raw) as Partial<AdminOrdersViewState>) : DEFAULT_ADMIN_ORDERS_VIEW_STATE;
    return normalizeAdminOrdersViewState({ ...saved, ...override });
  } catch {
    return normalizeAdminOrdersViewState({ ...DEFAULT_ADMIN_ORDERS_VIEW_STATE, ...override });
  }
}

export function writeAdminOrdersViewState(value: AdminOrdersViewState) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ADMIN_ORDERS_VIEW_STATE_KEY, JSON.stringify(normalizeAdminOrdersViewState(value)));
  } catch {
    // sessionStorage can be unavailable in private or embedded contexts.
  }
}
