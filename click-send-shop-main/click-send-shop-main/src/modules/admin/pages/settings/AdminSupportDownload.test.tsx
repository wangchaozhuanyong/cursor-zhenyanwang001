import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminSupportDownload from "./AdminSupportDownload";

const legacySupportDownloadConfig = JSON.stringify({
  enabled: true,
  title: "客服中心",
  subtitle: "客服说明",
  defaultTab: "download",
  support: {
    enabled: true,
    description: "客服渠道说明",
    workingHours: "10:00 - 18:00",
    channels: [],
  },
  download: {
    enabled: true,
    title: "添加到桌面",
    description: "大马通目前是网页版商城，不需要从应用商店下载。",
    platforms: [
      {
        id: "android",
        type: "android",
        enabled: true,
        title: "安卓手机",
        description: "添加到安卓桌面",
        buttonText: "一键添加到桌面",
        instructions: ["打开菜单", "添加到桌面"],
        sortOrder: 1,
      },
    ],
  },
});

vi.mock("@/components/admin/PermissionGate", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/admin/AdminPageShell", () => ({
  default: ({ children, toolbar }: { children: ReactNode; toolbar?: ReactNode }) => (
    <div>
      {toolbar}
      {children}
    </div>
  ),
}));

vi.mock("@/components/admin/AdminText", () => ({
  Tx: ({ children }: { children: string }) => <>{children}</>,
}));

vi.mock("@/hooks/useAdminT", () => ({
  useAdminT: () => ({ tText: (text: string) => text }),
}));

vi.mock("@/services/admin/settingsService", () => ({
  fetchSiteSettings: vi.fn(async () => ({
    supportDownloadConfig: legacySupportDownloadConfig,
  })),
  updateSiteSettings: vi.fn(),
}));

vi.mock("@/services/uploadService", () => ({
  uploadSingle: vi.fn(),
}));

vi.mock("@/hooks/useSiteInfo", () => ({
  refreshSiteInfo: vi.fn(),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("AdminSupportDownload", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  let queryClient: QueryClient | null = null;

  async function renderPage() {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/admin/support-download"]}>
            <AdminSupportDownload />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
  }

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    queryClient?.clear();
    container?.remove();
    container = null;
    root = null;
    queryClient = null;
    vi.clearAllMocks();
  });

  it("removes the retired add-to-desktop admin controls", async () => {
    await renderPage();

    expect(container).toHaveTextContent("客服配置");
    expect(container).toHaveTextContent("客服渠道列表");
    expect(container).not.toHaveTextContent("默认打开 Tab");
    expect(container).not.toHaveTextContent("手机添加到桌面说明");
    expect(container).not.toHaveTextContent("添加到桌面说明");
    expect(container).not.toHaveTextContent("添加到桌面 Tab 是否启用");
    expect(container).not.toHaveTextContent("一键添加到桌面");
    expect(container).not.toHaveTextContent("大马通目前是网页版商城，不需要从应用商店下载。");
  });
});
