import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminSupportDownload from "./AdminSupportDownload";

const settingsMocks = vi.hoisted(() => {
  const supportDownloadConfig = JSON.stringify({
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
      description: "大马通目前是网页版商城，可以添加到手机桌面快速打开。",
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

  return {
    fetchSiteSettings: vi.fn(async () => ({ supportDownloadConfig })),
    updateSiteSettings: vi.fn(async () => undefined),
  };
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
  Tx: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/useAdminT", () => ({
  useAdminT: () => ({ tText: (text: string) => text }),
}));

vi.mock("@/services/admin/settingsService", () => ({
  fetchSiteSettings: settingsMocks.fetchSiteSettings,
  updateSiteSettings: settingsMocks.updateSiteSettings,
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

  function setFieldValue(field: HTMLInputElement | HTMLTextAreaElement | undefined, value: string) {
    if (!field) throw new Error("field not found");
    const prototype = Object.getPrototypeOf(field);
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    setter?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function getSavedConfig() {
    expect(settingsMocks.updateSiteSettings).toHaveBeenCalledTimes(1);
    const payload = settingsMocks.updateSiteSettings.mock.calls[0]?.[0];
    return JSON.parse(String(payload?.supportDownloadConfig));
  }

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

  it("shows the add-to-desktop admin controls", async () => {
    await renderPage();

    expect(container).toHaveTextContent("客服配置");
    expect(container).toHaveTextContent("客服渠道列表");
    expect(container).toHaveTextContent("默认打开 Tab");
    expect(container).toHaveTextContent("手机添加到桌面说明");
    expect(container).toHaveTextContent("添加到桌面 Tab 是否启用");
    expect(container).toHaveTextContent("安卓手机");
    expect(container).toHaveTextContent("苹果手机");
  });

  it("keeps the download tab enabled when saving existing enabled config", async () => {
    await renderPage();

    const saveButton = container?.querySelector("button");
    expect(saveButton).toBeTruthy();

    await act(async () => {
      saveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(settingsMocks.updateSiteSettings).toHaveBeenCalledTimes(1);
    const saved = getSavedConfig();

    expect(saved.defaultTab).toBe("download");
    expect(saved.download.enabled).toBe(true);
    expect(saved.download.platforms.map((platform: { type: string }) => platform.type)).toEqual(["android", "ios"]);
    expect(saved.download.platforms.find((platform: { type: string }) => platform.type === "ios")).toMatchObject({
      enabled: false,
      title: "",
      description: "",
      buttonText: "",
      instructions: [],
    });
  });

  it("saves cleared text fields as empty strings instead of built-in defaults", async () => {
    await renderPage();

    const inputs = Array.from(container?.querySelectorAll("input") ?? []);
    const textareas = Array.from(container?.querySelectorAll("textarea") ?? []);

    await act(async () => {
      setFieldValue(inputs.find((input) => input.value === "客服中心"), "");
      setFieldValue(inputs.find((input) => input.value === "客服说明"), "");
      setFieldValue(textareas.find((textarea) => textarea.value === "客服渠道说明"), "");
      setFieldValue(inputs.find((input) => input.value === "添加到桌面"), "");
      setFieldValue(textareas.find((textarea) => textarea.value.includes("手机桌面快速打开")), "");
      setFieldValue(inputs.find((input) => input.value === "安卓手机"), "");
      setFieldValue(inputs.find((input) => input.value === "添加到安卓桌面"), "");
      setFieldValue(inputs.find((input) => input.value === "一键添加到桌面"), "");
      setFieldValue(textareas.find((textarea) => textarea.value.includes("打开菜单")), "");
    });

    const saveButton = container?.querySelector("button");
    expect(saveButton).toBeTruthy();

    await act(async () => {
      saveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    const saved = getSavedConfig();
    const android = saved.download.platforms.find((platform: { type: string }) => platform.type === "android");

    expect(saved.title).toBe("");
    expect(saved.subtitle).toBe("");
    expect(saved.support.description).toBe("");
    expect(saved.download.title).toBe("");
    expect(saved.download.description).toBe("");
    expect(android).toMatchObject({
      title: "",
      description: "",
      buttonText: "",
      instructions: [],
    });
  });
});
