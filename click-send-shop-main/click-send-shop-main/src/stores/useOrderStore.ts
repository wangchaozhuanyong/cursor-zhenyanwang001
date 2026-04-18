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

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  pagination: PaginationState;
  filterStatus: OrderStatus | "all";
  loading: boolean;
  submitting: boolean;
  error: string | null;

  loadOrders: (params?: OrderListParams) => Promise<void>;
  loadOrderDetail: (id: string) => Promise<void>;
  submitOrder: (params: SubmitOrderParams) => Promise<Order>;
  cancelOrder: (id: string) => Promise<void>;
  confirmReceive: (id: string) => Promise<void>;
  setFilterStatus: (status: OrderStatus | "all") => void;
  clearError: () => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  currentOrder: null,
  pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
  filterStatus: "all",
  loading: false,
  submitting: false,
  error: null,

  loadOrders: async (params) => {
    const requestPage = params?.page ?? 1;
    set({ loading: true, error: null });
    try {
      const filter = get().filterStatus;
      const data = await orderService.fetchOrders({
        ...params,
        status: filter === "all" ? undefined : filter,
      });
      set((s) => ({
        orders: requestPage === 1 ? data.list : [...s.orders, ...data.list],
        pagination: {
          total: data.total,
          page: data.page,
          pageSize: data.pageSize,
          totalPages: data.totalPages,
        },
        loading: false,
      }));
    } catch (e) {
      set({
        loading: false,
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
        submitting: false,
      }));
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

  setFilterStatus: (filterStatus) => set({ filterStatus, orders: [], pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 } }),
  clearError: () => set({ error: null }),
}));
