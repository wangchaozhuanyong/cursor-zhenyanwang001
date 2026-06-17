import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SITE_CAPABILITIES, type SiteCapabilities } from "@/types/siteCapabilities";
import AdminFeatureSettings from "./AdminFeatureSettings";

const settingsMocks = vi.hoisted(() => ({
  fetchSiteCapabilities: vi.fn(),
  updateSiteCapabilities: vi.fn(),
  refreshSiteCapabilities: vi.fn(),
  clearCachedAuthFeatures: vi.fn(),
}));

vi.mock("@/components/admin/AdminPageShell", () => ({
  default: ({ children, hint, toolbar }: { children: ReactNode; hint?: ReactNode; toolbar?: ReactNode }) => (
    <div>
      {hint}
      {toolbar}
      {children}
    </div>
  ),
}));

vi.mock("@/components/admin/AdminFieldHint", () => ({
  default: ({ text }: { text: string }) => <span>{text}</span>,
}));

vi.mock("@/components/admin/AdminText", () => ({
  Tx: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/useAdminT", () => ({
  useAdminT: () => ({ tText: (text: string) => text }),
}));

vi.mock("@/hooks/useSiteCapabilities", () => ({
  refreshSiteCapabilities: settingsMocks.refreshSiteCapabilities,
}));

vi.mock("@/services/admin/settingsService", () => ({
  fetchSiteCapabilities: settingsMocks.fetchSiteCapabilities,
  updateSiteCapabilities: settingsMocks.updateSiteCapabilities,
}));

vi.mock("@/stores/useAdminPermissionStore", () => ({
  useAdminPermissionStore: (selector: (state: { isSuperAdmin: boolean }) => unknown) => selector({ isSuperAdmin: false }),
}));

vi.mock("@/utils/authFeaturesCache", () => ({
  clearCachedAuthFeatures: settingsMocks.clearCachedAuthFeatures,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("AdminFeatureSettings storefront language controls", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  let queryClient: QueryClient | null = null;

  async function renderPage(capabilities: SiteCapabilities = DEFAULT_SITE_CAPABILITIES) {
    settingsMocks.fetchSiteCapabilities.mockResolvedValue({ ...capabilities });
    settingsMocks.updateSiteCapabilities.mockImplementation(async (payload: SiteCapabilities) => payload);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/admin/settings/features"]}>
            <AdminFeatureSettings />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
  }

  function getStorefrontMultilingualCheckbox() {
    const checkbox = container?.querySelector<HTMLInputElement>('input[aria-label="前台多语言（中文/英文）"]');
    if (!checkbox) throw new Error("storefront multilingual checkbox not found");
    return checkbox;
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

  it("keeps storefront multilingual disabled by default while exposing the admin switch", async () => {
    await renderPage();

    expect(container).toHaveTextContent("前台多语言（中文/英文）");
    expect(container).toHaveTextContent("默认关闭，前台只显示中文");
    expect(container).toHaveTextContent("马来文入口不再开放");
    expect(getStorefrontMultilingualCheckbox().checked).toBe(false);
  });

  it("saves the admin-controlled storefront multilingual switch", async () => {
    await renderPage();

    const checkbox = getStorefrontMultilingualCheckbox();
    await act(async () => {
      checkbox.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const saveButton = Array.from(container?.querySelectorAll("button") ?? [])
      .find((button) => button.textContent?.includes("保存"));
    expect(saveButton).toBeTruthy();

    await act(async () => {
      saveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(settingsMocks.updateSiteCapabilities).toHaveBeenCalledTimes(1);
    const payload = settingsMocks.updateSiteCapabilities.mock.calls[0]?.[0] as SiteCapabilities;
    expect(payload.storefrontMultilingualEnabled).toBe(true);
    expect(payload.languageGateEnabled).toBe(false);
  });
});
