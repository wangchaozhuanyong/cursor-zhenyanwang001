import { create } from "zustand";
import type { Order, OrderStatus, SubmitOrderParams, OrderListParams } from "@/types/order";
import * as orderService from "@/services/orderService";
import { ORDER_STATUS } from "@/constants/statusDictionary";

interface PaginationState {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface OrderListCacheEntry {
  orders: Order[];
  pagination: PaginationState;
  cachedAt: number;
}

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  pagination: PaginationState;
  orderListCache: Record<string, OrderListCacheEntry>;
  filterStatus: OrderStatus | "all";
  loading: boolean;
  loadingMore: boolean;
  submitting: boolean;
  error: string | null;

  loadOrders: (params?: OrderListParams) => Promise<void>;
  loadOrderDetail: (id: string) => Promise<void>;
  submitOrder: (params: SubmitOrderParams) => Promise<Order>;
  cancelOrder: (id: string) => Promise<void>;
  confirmReceive: (id: string) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  setFilterStatus: (status: OrderStatus | "all") => void;
  clearError: () => void;
}

const ORDER_LIST_CACHE_TTL_MS = 60_000;

function buildOrderListCacheKey(params: OrderListParams) {
  const entries = Object.entries(params)
    .filter(([key, value]) => key !== "page" && key !== "force" && value !== undefined && value !== null && value !== "")
    .map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : String(value)])
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  currentOrder: null,
  pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
  orderListCache: {},
  filterStatus: "all",
  loading: false,
  loadingMore: false,
  submitting: false,
  error: null,

  loadOrders: async (params) => {
    const { force = false, ...requestParams } = params ?? {};
    const requestPage = requestParams.page ?? 1;
    const loadingKey = requestPage > 1 ? "loadingMore" : "loading";
    const filter = get().filterStatus;
    const normalizedParams = {
      ...requestParams,
      status: filter === "all" ? undefined : filter,
    };
    const cacheKey = buildOrderListCacheKey(normalizedParams);
    const cached = requestPage === 1 ? get().orderListCache[cacheKey] : undefined;

    if (!force && cached && Date.now() - cached.cachedAt < ORDER_LIST_CACHE_TTL_MS) {
      set({
        orders: cached.orders,
        pagination: cached.pagination,
        loading: false,
        loadingMore: false,
        error: null,
      });
      return;
    }

    set({ [loadingKey]: true, error: null });
    try {
      const data = await orderService.fetchOrders(normalizedParams);
      set((s) => ({
        orders: requestPage === 1 ? data.list : [...s.orders, ...data.list],
        pagination: {
          total: data.total,
          page: data.page,
          pageSize: data.pageSize,
          totalPages: data.totalPages,
        },
        orderListCache: requestPage === 1
          ? {
              ...s.orderListCache,
              [cacheKey]: {
                orders: data.list,
                pagination: {
                  total: data.total,
                  page: data.page,
                  pageSize: data.pageSize,
                  totalPages: data.totalPages,
                },
                cachedAt: Date.now(),
              },
            }
          : s.orderListCache,
        loading: false,
        loadingMore: false,
      }));
    } catch (e) {
      set({
        [loadingKey]: false,
        error: e instanceof Error ? e.message : "加载订单失败",
      });
    }
  },

  loadOrderDetail: async (id) => {
    set({ loading: true, error: null, currentOrder: null });
    try {
      const order = await orderService.fetchOrderById(id);
      set({ currentOrder: order, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "加载订单详情失败",
      });
    }
  },

  submitOrder: async (params) => {
    set({ submitting: true, error: null });
    try {
      const order = await orderService.submitOrder(params);
      set((s) => ({
        orders: [order, ...s.orders],
        orderListCache: {},
        submitting: false,
      }));
      await get().loadOrders({ page: 1, force: true });
      return order;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "提交订单失败";
      set({ submitting: false, error: msg });
      throw e;
    }
  },

  cancelOrder: async (id) => {
    try {
      await orderService.cancelOrder(id);
      set((s) => ({
        orders: s.orders.map((o) =>
          o.id === id ? { ...o, status: ORDER_STATUS.CANCELLED as OrderStatus } : o
        ),
        orderListCache: {},
        currentOrder:
          s.currentOrder?.id === id
            ? { ...s.currentOrder, status: ORDER_STATUS.CANCELLED as OrderStatus }
            : s.currentOrder,
      }));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "取消订单失败" });
      throw e;
    }
  },

  confirmReceive: async (id) => {
    try {
      await orderService.confirmReceive(id);
      set((s) => ({
        orders: s.orders.map((o) =>
          o.id === id ? { ...o, status: ORDER_STATUS.COMPLETED as OrderStatus } : o
        ),
        orderListCache: {},
        currentOrder:
          s.currentOrder?.id === id
            ? { ...s.currentOrder, status: ORDER_STATUS.COMPLETED as OrderStatus }
            : s.currentOrder,
      }));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "确认收货失败" });
      throw e;
    }
  },

  deleteOrder: async (id) => {
    try {
      await orderService.deleteOrder(id);
      set((s) => ({
        orders: s.orders.filter((o) => o.id !== id),
        orderListCache: {},
        currentOrder: s.currentOrder?.id === id ? null : s.currentOrder,
      }));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "删除订单失败" });
      throw e;
    }
  },

  setFilterStatus: (filterStatus) => set({ filterStatus, orders: [], orderListCache: {}, loadingMore: false, pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 } }),
  clearError: () => set({ error: null }),
}));
