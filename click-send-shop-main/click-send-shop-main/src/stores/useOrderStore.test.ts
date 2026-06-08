import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/types/order";
import * as orderService from "@/services/orderService";
import { useOrderStore } from "./useOrderStore";

vi.mock("@/services/orderService", () => ({
  fetchOrders: vi.fn(),
  fetchOrderById: vi.fn(),
  submitOrder: vi.fn(),
  cancelOrder: vi.fn(),
  confirmReceive: vi.fn(),
  deleteOrder: vi.fn(),
}));

function order(id: string): Order {
  return {
    id,
    order_no: id,
    status: "paid",
    payment_status: "paid",
    order_type: "normal",
    total_amount: 100,
    items: [],
  } as unknown as Order;
}

function page(list: Order[], pageNo: number, total: number, pageSize = 1) {
  return {
    list,
    total,
    page: pageNo,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

describe("useOrderStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOrderStore.setState({
      orders: [],
      currentOrder: null,
      pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
      orderListCache: {},
      filterStatus: "all",
      loading: false,
      loadingMore: false,
      submitting: false,
      error: null,
    });
  });

  it("replaces the first page and appends later pages", async () => {
    vi.mocked(orderService.fetchOrders)
      .mockResolvedValueOnce(page([order("order_1")], 1, 2))
      .mockResolvedValueOnce(page([order("order_2")], 2, 2));

    await useOrderStore.getState().loadOrders({ page: 1, keyword: "签证" });
    await useOrderStore.getState().loadOrders({ page: 2, pageSize: 1, keyword: "签证" });

    expect(orderService.fetchOrders).toHaveBeenNthCalledWith(1, { page: 1, keyword: "签证", status: undefined });
    expect(orderService.fetchOrders).toHaveBeenNthCalledWith(2, { page: 2, pageSize: 1, keyword: "签证", status: undefined });
    expect(useOrderStore.getState().orders.map((row) => row.id)).toEqual(["order_1", "order_2"]);
    expect(useOrderStore.getState().pagination).toMatchObject({ page: 2, total: 2, totalPages: 2 });
  });

  it("reuses cached first pages for the same order tab", async () => {
    vi.mocked(orderService.fetchOrders)
      .mockResolvedValueOnce(page([order("paid_order")], 1, 1))
      .mockResolvedValueOnce(page([order("fresh_paid_order")], 1, 1));

    await useOrderStore.getState().loadOrders({ page: 1, tab: "paid" });
    await useOrderStore.getState().loadOrders({ page: 1, tab: "paid" });

    expect(orderService.fetchOrders).toHaveBeenCalledTimes(1);
    expect(useOrderStore.getState().orders.map((row) => row.id)).toEqual(["paid_order"]);

    await useOrderStore.getState().loadOrders({ page: 1, tab: "paid", force: true });

    expect(orderService.fetchOrders).toHaveBeenCalledTimes(2);
    expect(orderService.fetchOrders).toHaveBeenNthCalledWith(2, { page: 1, tab: "paid", status: undefined });
    expect(useOrderStore.getState().orders.map((row) => row.id)).toEqual(["fresh_paid_order"]);
  });

  it("uses loadingMore for pages after the first without clearing existing orders", async () => {
    let resolvePage!: (value: ReturnType<typeof page>) => void;
    vi.mocked(orderService.fetchOrders).mockReturnValue(
      new Promise((resolve) => {
        resolvePage = resolve;
      }),
    );
    useOrderStore.setState({
      orders: [order("visible_order")],
      pagination: { total: 2, page: 1, pageSize: 1, totalPages: 2 },
    });

    const promise = useOrderStore.getState().loadOrders({ page: 2, pageSize: 1 });

    expect(useOrderStore.getState().loading).toBe(false);
    expect(useOrderStore.getState().loadingMore).toBe(true);
    expect(useOrderStore.getState().orders.map((row) => row.id)).toEqual(["visible_order"]);

    resolvePage(page([order("next_order")], 2, 2));
    await promise;

    expect(useOrderStore.getState().loadingMore).toBe(false);
    expect(useOrderStore.getState().orders.map((row) => row.id)).toEqual(["visible_order", "next_order"]);
  });
});
