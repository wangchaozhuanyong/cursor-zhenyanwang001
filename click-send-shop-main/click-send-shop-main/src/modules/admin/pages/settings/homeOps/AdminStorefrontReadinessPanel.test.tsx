import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StorefrontReadiness } from "@/types/storefrontReadiness";
import AdminStorefrontReadinessPanel from "./AdminStorefrontReadinessPanel";

const mocks = vi.hoisted(() => ({
  fetchStorefrontReadiness: vi.fn(),
}));

vi.mock("@/services/admin/homeOpsService", () => ({
  fetchStorefrontReadiness: mocks.fetchStorefrontReadiness,
}));

vi.mock("@/components/admin/AdminText", () => ({
  Tx: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOT_READY: StorefrontReadiness = {
  status: "not_ready",
  checked_at: "2026-07-29T12:00:00.000Z",
  summary: {
    blocker_count: 54,
    review_count: 8,
    ready_check_count: 0,
    total_check_count: 5,
  },
  banners: {
    active_count: 7,
    missing_count: 7,
    items: [{ id: "banner-1", title: "会员权益", missing_mobile: true, missing_desktop: true }],
  },
  categories: {
    visible_root_count: 7,
    review_count: 7,
    items: [{ id: "category-1", name: "签证服务", banner_enabled: false }],
  },
  navigation: {
    enabled_count: 10,
    invalid_count: 5,
    external_review_count: 1,
    invalid_items: [{ id: "nav-1", title: "床上用品", target_type: "url" }],
    external_items: [{ id: "nav-2", title: "邀请返现", link_url: "https://example.com/invite" }],
  },
  products: {
    home_count: 48,
    missing_count: 41,
    items: [{ id: "product-1", name: "缺图商品", groups: ["hot"] }],
  },
  compliance: {
    age_gate_enabled: false,
    minimum_age: 18,
    restricted_category_count: 2,
    blocker_count: 1,
    items: [
      { id: "category-tobacco", name: "正品烟草" },
      { id: "category-alcohol", name: "正品酒水" },
    ],
  },
};

describe("AdminStorefrontReadinessPanel", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  let queryClient: QueryClient | null = null;

  async function renderPanel() {
    mocks.fetchStorefrontReadiness.mockResolvedValue(NOT_READY);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/admin/home-ops?tab=readiness"]}>
            <AdminStorefrontReadinessPanel />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
  }

  afterEach(() => {
    if (root) act(() => root?.unmount());
    queryClient?.clear();
    container?.remove();
    container = null;
    root = null;
    queryClient = null;
    vi.clearAllMocks();
  });

  it("shows current blockers and direct repair links without writing data", async () => {
    await renderPanel();

    expect(container).toHaveTextContent("内容尚未准备完成");
    expect(container).toHaveTextContent("54");
    expect(container).toHaveTextContent("首页轮播双图");
    expect(container).toHaveTextContent("一级分类横幅");
    expect(container).toHaveTextContent("首页快捷入口");
    expect(container).toHaveTextContent("首页商品图片");
    expect(container).toHaveTextContent("受限商品年龄确认");
    expect(
      [...(container?.querySelectorAll("a") || [])].map((link) => link.getAttribute("href")),
    ).toContain("/admin/banners?media_status=responsive_missing&repair_scope=home");
    expect(container?.querySelector('a[href="/admin/categories?banner_status=review"]')).toBeTruthy();
    expect(
      [...(container?.querySelectorAll("a") || [])].map((link) => link.getAttribute("href")),
    ).toContain("/admin/home-ops?tab=nav&repair_scope=invalid");
    expect(
      [...(container?.querySelectorAll("a") || [])].map((link) => link.getAttribute("href")),
    ).toContain("/admin/products?media_status=missing&repair_scope=home");
    expect(container?.querySelector('a[href="/admin/settings/site#compliance"]')).toBeTruthy();
    expect(mocks.fetchStorefrontReadiness).toHaveBeenCalledTimes(1);
  });
});
