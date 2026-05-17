import { create } from "zustand";
import type { AdminOrderSummary, Order, OrderStatus, PaymentStatus } from "@/types/order";
import * as orderService from "@/services/admin/orderService";

const initialState = {
  orders: [] as Order[],
  loading: true,
  statusFilter: "",
  paymentFilter: "" as "" | PaymentStatus,
  search: "",
  dateFrom: "",
  dateTo: "",
  paymentMethod: "",
  paymentChannel: "",
  shippingName: "",
  amountMin: "",
  amountMax: "",
  page: 1,
  pageSize: 20,
  total: 0,
  summary: {
    pending: 0,
    paid: 0,
    shipped: 0,
    completed: 0,
    cancelled: 0,
    refunding: 0,
    refunded: 0,
  },
};

/**
 * 管理后台「订单列表」页状态：筛选、列表数据、加载态。
 * 业务调用仍走 admin orderService；本 Store 不触发 toast（由 Page 处理反馈）。
 */
interface AdminOrdersState {
  orders: Order[];
  loading: boolean;
  statusFilter: string;
  paymentFilter: "" | PaymentStatus;
  search: string;
  dateFrom: string;
  dateTo: string;
  paymentMethod: string;
  paymentChannel: string;
  shippingName: string;
  amountMin: string;
  amountMax: string;
  page: number;
  pageSize: number;
  total: number;
  summary: AdminOrderSummary;

  setStatusFilter: (v: string) => void;
  setPaymentFilter: (v: "" | PaymentStatus) => void;
  setSearch: (v: string) => void;
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
  setPaymentMethod: (v: string) => void;
  setPaymentChannel: (v: string) => void;
  setShippingName: (v: string) => void;
  setAmountMin: (v: string) => void;
  setAmountMax: (v: string) => void;
  setPage: (v: number) => void;
  setPageSize: (v: number) => void;

  loadOrders: () => Promise<void>;
  applyOrderStatus: (orderId: string, status: OrderStatus) => void;
  reset: () => void;
}

export const useAdminOrdersStore = create<AdminOrdersState>((set, get) => ({
  ...initialState,

  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setPaymentFilter: (paymentFilter) => set({ paymentFilter }),
  setSearch: (search) => set({ search }),
  setDateFrom: (dateFrom) => set({ dateFrom }),
  setDateTo: (dateTo) => set({ dateTo }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setPaymentChannel: (paymentChannel) => set({ paymentChannel }),
  setShippingName: (shippingName) => set({ shippingName }),
  setAmountMin: (amountMin) => set({ amountMin }),
  setAmountMax: (amountMax) => set({ amountMax }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize }),

  reset: () => set({ ...initialState }),

  loadOrders: async () => {
    set({ loading: true });
    try {
      const {
        statusFilter,
        paymentFilter,
        search,
        dateFrom,
        dateTo,
        paymentMethod,
        paymentChannel,
        shippingName,
        amountMin,
        amountMax,
        page,
        pageSize,
      } = get();
      const p = await orderService.fetchOrders({
        page,
        pageSize,
        status: (statusFilter || undefined) as OrderStatus | undefined,
        paymentStatus: paymentFilter || undefined,
        keyword: search.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        payment_method: paymentMethod || undefined,
        payment_channel: paymentChannel || undefined,
        shipping_name: shippingName || undefined,
        amountMin: amountMin ? Number(amountMin) : undefined,
        amountMax: amountMax ? Number(amountMax) : undefined,
      });
      const summary = (p as unknown as { summary?: AdminOrderSummary }).summary;
      set({
        orders: p.list as Order[],
        total: p.total,
        page: p.page,
        pageSize: p.pageSize,
        summary: summary || initialState.summary,
        loading: false,
      });
    } catch {
      set({ loading: false });
      throw new Error("LOAD_ADMIN_ORDERS_FAILED");
    }
  },

  applyOrderStatus: (orderId, status) => {
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
    }));
  },
}));
