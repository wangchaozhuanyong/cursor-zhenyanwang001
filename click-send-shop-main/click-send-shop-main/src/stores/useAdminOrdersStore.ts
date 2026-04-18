import { create } from "zustand";
import type { Order, OrderStatus, PaymentStatus } from "@/types/order";
import * as orderService from "@/services/admin/orderService";

const initialState = {
  orders: [] as Order[],
  loading: true,
  statusFilter: "",
  paymentFilter: "" as "" | PaymentStatus,
  search: "",
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

  setStatusFilter: (v: string) => void;
  setPaymentFilter: (v: "" | PaymentStatus) => void;
  setSearch: (v: string) => void;

  loadOrders: () => Promise<void>;
  /** 本地同步一行状态（接口已成功之后由 Page 调用，或在此与 API 组合） */
  applyOrderStatus: (orderId: string, status: OrderStatus) => void;
  /** 离开列表路由时清空，避免全局缓存干扰其它入口 */
  reset: () => void;
}

export const useAdminOrdersStore = create<AdminOrdersState>((set, get) => ({
  ...initialState,

  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setPaymentFilter: (paymentFilter) => set({ paymentFilter }),
  setSearch: (search) => set({ search }),

  reset: () => set({ ...initialState }),

  loadOrders: async () => {
    set({ loading: true });
    const { statusFilter, paymentFilter, search } = get();
    try {
      const p = await orderService.fetchOrders({
        page: 1,
        pageSize: 500,
        status: (statusFilter || undefined) as OrderStatus | undefined,
        paymentStatus: paymentFilter || undefined,
        keyword: search.trim() || undefined,
      });
      set({ orders: p.list as Order[], loading: false });
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
