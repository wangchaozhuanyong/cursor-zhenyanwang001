import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import Notifications from "@/modules/public/pages/user/Notifications";
import FeatureUnavailable from "./FeatureUnavailable";

const navigate = vi.fn();
const loadNotifications = vi.fn(async () => {});
const markAsRead = vi.fn(async () => {});
const markAllAsRead = vi.fn(async () => {});

vi.mock("@/components/storefront-motion/useStorefrontNavigate", () => ({
  useStorefrontNavigate: () => navigate,
}));

vi.mock("@/hooks/useSiteCapabilities", () => ({
  useSiteCapabilities: () => ({
    customerServiceDownloadEnabled: true,
  }),
}));

vi.mock("@/hooks/useGoBack", () => ({
  useGoBack: () => vi.fn(),
}));

vi.mock("@/hooks/useHorizontalActiveScroll", () => ({
  useHorizontalActiveScroll: () => ({
    containerRef: { current: null },
    setItemRef: vi.fn(),
    scrollToKey: vi.fn(),
  }),
}));

vi.mock("@/components/store/StoreAccountLayout", () => ({
  default: ({ children, title }: { children: ReactNode; title: ReactNode }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));

vi.mock("@/stores/useNotificationStore", () => ({
  useNotificationStore: () => ({
    notifications: [
      {
        id: "notification-1",
        type: "shipping",
        title: "订单已发货",
        content: "您的订单已经交给承运商。",
        is_read: false,
        created_at: "2026-07-29T12:00:00Z",
      },
    ],
    unreadCount: 1,
    loading: false,
    error: null,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("fixed client status and notification design", () => {
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

  const renderRoute = async (node: ReactNode) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<MemoryRouter>{node}</MemoryRouter>);
      await Promise.resolve();
    });
    return container;
  };

  it("uses the fixed editorial unavailable state without the legacy surface card", async () => {
    const view = await renderRoute(<FeatureUnavailable />);

    expect(view.querySelector(".sf-next-feature-unavailable")).toBeInTheDocument();
    expect(view.querySelector(".sf-next-surface-card")).not.toBeInTheDocument();
    expect(view.textContent).toContain("功能暂未开放");

    const homeButton = Array.from(view.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("返回首页"),
    );
    await act(async () => {
      homeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("renders notifications as accessible flat rows instead of repeated cards", async () => {
    const view = await renderRoute(<Notifications />);

    const row = view.querySelector<HTMLButtonElement>("button.sf-next-notifications-card");
    expect(row).toBeInTheDocument();
    expect(row?.textContent).toContain("订单已发货");
    expect(view.textContent).toContain("未读 1");
    expect(view.textContent).not.toContain("消息分类");
    expect(view.querySelector(".sf-next-notifications-empty-lines")).not.toBeInTheDocument();
  });
});
