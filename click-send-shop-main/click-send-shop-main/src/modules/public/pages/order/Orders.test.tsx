import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Orders from "./Orders";

const testState = vi.hoisted(() => ({
  navigate: vi.fn(),
  loadOrders: vi.fn(async () => {}),
  cancelOrder: vi.fn(async () => {}),
  confirmReceive: vi.fn(async () => {}),
  deleteOrder: vi.fn(async () => {}),
  addToCart: vi.fn(async () => {}),
  clearBuyNow: vi.fn(),
  setSelectAll: vi.fn(),
  order: {
    id: "order-1",
    order_no: "MY202608010001",
    items: [
      {
        id: "item-1",
        order_item_id: "item-1",
        product: {
          id: "product-1",
          name: "测试商品",
          cover_image: "",
          images: [],
          price: 18,
          points: 0,
          category_id: "category-1",
          stock: 10,
          status: "active",
          sort_order: 1,
          description: "",
          is_recommended: false,
          is_new: false,
          is_hot: false,
        },
        qty: 1,
        unit_price: 18,
        variant_name: "默认规格",
      },
    ],
    raw_amount: 18,
    discount_amount: 0,
    coupon_title: "",
    shipping_fee: 0,
    shipping_name: "",
    total_amount: 18,
    total_points: 0,
    status: "paid",
    payment_status: "paid",
    note: "",
    created_at: "2026-08-01T00:00:00Z",
    contact_name: "测试用户",
    contact_phone: "60123456789",
    address: "Kuala Lumpur",
    order_type: "normal",
    payment_method: "online",
  },
}));

vi.mock("@/components/store/StoreAccountLayout", () => ({
  default: ({ children, title }: { children: ReactNode; title: ReactNode }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));

vi.mock("@/components/storefront-motion/StorefrontQuietLoading", () => ({
  default: () => null,
}));

vi.mock("@/components/order/OrderPaymentCountdown", () => ({
  OrderPaymentCountdown: () => null,
}));

vi.mock("@/components/order/OrderAutoConfirmCountdown", () => ({
  OrderAutoConfirmCountdown: () => null,
}));

vi.mock("@/components/ProductCoverImage", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock("@/components/store/StoreSearchField", () => ({
  default: () => <input aria-label="搜索订单" />,
}));

vi.mock("@/modules/micro-interactions", () => ({
  AppModal: () => null,
  BottomSheetConfirm: () => null,
}));

vi.mock("./ReturnApplySheet", () => ({
  default: () => null,
}));

vi.mock("@/components/storefront-motion/useStorefrontNavigate", () => ({
  useStorefrontNavigate: () => testState.navigate,
}));

vi.mock("@/i18n/publicLocale", () => ({
  usePublicLocale: () => ({
    locale: "zh",
    localizedPath: (path: string) => path,
  }),
}));

vi.mock("@/hooks/useHorizontalActiveScroll", () => ({
  useHorizontalActiveScroll: () => ({
    containerRef: { current: null },
    setItemRef: vi.fn(),
    scrollToKey: vi.fn(),
  }),
}));

vi.mock("@/hooks/useSiteCapabilities", () => ({
  useSiteCapabilities: () => ({ reviewEnabled: false }),
}));

vi.mock("@/hooks/usePayPendingOrder", () => ({
  usePayPendingOrder: () => ({ paying: false, payPendingOrder: vi.fn() }),
}));

vi.mock("@/stores/useOrderStore", () => {
  const stableState = {
    orders: [testState.order],
    pagination: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
    loading: false,
    loadingMore: false,
    error: null,
    loadOrders: testState.loadOrders,
    cancelOrder: testState.cancelOrder,
    confirmReceive: testState.confirmReceive,
    deleteOrder: testState.deleteOrder,
  };
  return { useOrderStore: () => stableState };
});

vi.mock("@/stores/useCartStore", () => ({
  useCartStore: () => ({
    addToCart: testState.addToCart,
    clearBuyNow: testState.clearBuyNow,
    setSelectAll: testState.setSelectAll,
  }),
}));

vi.mock("@/services/orderService", () => ({
  fetchOrderSummary: vi.fn(async () => ({
    total: 1,
    pending_payment: 0,
    paid: 1,
    pending_ship: 1,
    shipped: 0,
    pending_receive: 0,
    pending_review: 0,
    completed: 0,
    after_sale: 0,
    cancelled: 0,
  })),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("Orders card detail navigation", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container?.remove();
    container = null;
    root = null;
    vi.clearAllMocks();
  });

  async function renderOrders() {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={["/orders"]}>
          <Orders />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    return container;
  }

  it("keeps whole-card mouse navigation and exposes an isolated focusable detail action", async () => {
    const view = await renderOrders();
    const card = view.querySelector<HTMLElement>(".sf-next-order-card");
    const detailAction = view.querySelector<HTMLButtonElement>(
      'button[aria-label="查看订单 MY202608010001 详情"]',
    );

    expect(card).toBeInTheDocument();
    expect(detailAction).toBeInTheDocument();
    expect(detailAction?.tabIndex).toBe(0);

    act(() => {
      detailAction?.click();
    });
    expect(testState.navigate).toHaveBeenCalledTimes(1);
    expect(testState.navigate).toHaveBeenLastCalledWith("/orders/order-1", {
      state: { from: "/orders" },
    });

    testState.navigate.mockClear();
    act(() => {
      card?.click();
    });
    expect(testState.navigate).toHaveBeenCalledTimes(1);
    expect(testState.navigate).toHaveBeenLastCalledWith("/orders/order-1", {
      state: { from: "/orders" },
    });
  });

  it("does not also open order details when an inner action is activated", async () => {
    const view = await renderOrders();
    const supportAction = Array.from(view.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent?.trim() === "联系客服",
    );

    expect(supportAction).toBeInTheDocument();
    act(() => {
      supportAction?.click();
    });

    expect(testState.navigate).toHaveBeenCalledTimes(1);
    expect(testState.navigate).toHaveBeenCalledWith(expect.stringContaining("/support-download"));
    expect(testState.navigate).not.toHaveBeenCalledWith(
      "/orders/order-1",
      expect.anything(),
    );
  });
});
