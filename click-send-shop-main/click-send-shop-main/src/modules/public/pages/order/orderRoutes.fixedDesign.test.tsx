import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as returnService from "@/services/returnService";
import * as reviewService from "@/services/reviewService";
import PendingReviews from "@/modules/public/pages/review/PendingReviews";
import Returns from "./Returns";

vi.mock("@/components/store/StoreAccountLayout", () => ({
  default: ({ children, title }: { children: ReactNode; title: string }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));

vi.mock("@/components/ProductCoverImage", () => ({
  default: ({ alt }: { alt?: string }) => <img alt={alt || ""} />,
}));

vi.mock("@/components/review/ReviewComposerSheet", () => ({
  default: () => null,
}));

vi.mock("./ReturnApplySheet", () => ({
  default: () => null,
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

vi.mock("@/components/storefront-motion/useStorefrontNavigate", () => ({
  useStorefrontNavigate: () => vi.fn(),
}));

vi.mock("@/i18n/publicLocale", () => ({
  usePublicLocale: () => ({
    locale: "zh",
    localizedPath: (path: string) => path,
  }),
}));

vi.mock("@/services/returnService", () => ({
  fetchReturnRequests: vi.fn(),
}));

vi.mock("@/services/reviewService", () => ({
  fetchPendingReviewItems: vi.fn(),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("fixed order route design", () => {
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

  it("keeps the returns page compact and removes the legacy dashboard title", async () => {
    vi.mocked(returnService.fetchReturnRequests).mockResolvedValue({
      list: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    });

    const view = await renderRoute(<Returns />);

    expect(view.textContent).toContain("售后进度");
    expect(view.textContent).toContain("查看退款、退货、换货和维修处理进度。");
    expect(view.textContent).not.toContain("售后进度中心");
    expect(view.querySelector(".sf-next-returns-summary")).not.toBeInTheDocument();
    expect(view.querySelector(".sf-next-returns-tabs")).toBeInTheDocument();
    expect(view.querySelectorAll("main")).toHaveLength(1);
    expect(view.querySelectorAll("h1")).toHaveLength(1);
  });

  it("uses the compact pending-review summary without the redundant guide", async () => {
    vi.mocked(reviewService.fetchPendingReviewItems).mockResolvedValue([
      {
        order_id: "order-1",
        order_no: "CG202607290001",
        order_item_id: "item-1",
        product_id: "product-1",
        product_name: "南洋白咖啡礼盒",
        product_image: "/coffee.jpg",
        variant_name: "榛果风味",
        qty: 1,
        completed_at: "2026-07-29T12:00:00Z",
      },
    ]);

    const view = await renderRoute(<PendingReviews />);

    expect(view.textContent).toContain("1件商品待评价");
    expect(view.textContent).toContain("南洋白咖啡礼盒");
    expect(view.textContent).not.toContain("评价中心");
    expect(view.textContent).not.toContain("评价规范");
    expect(view.querySelector(".sf-next-pending-reviews-summary")).toBeInTheDocument();
  });
});
