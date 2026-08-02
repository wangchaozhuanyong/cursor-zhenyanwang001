import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import SupportDownload from "./SupportDownload";

const supportConfigState = vi.hoisted(() => ({ enabled: true }));

vi.mock("@/components/SeoHead", () => ({
  default: () => null,
}));

vi.mock("@/components/store/StorePageHeader", () => ({
  default: () => <div data-testid="mobile-header" />,
}));

vi.mock("@/components/store/StoreTabletBar", () => ({
  default: () => <div data-testid="tablet-header" />,
}));

vi.mock("@/components/store/StoreDesktopHeader", () => ({
  default: () => <div data-testid="desktop-header" />,
}));

vi.mock("@/components/support/SupportChannelCard", () => ({
  default: () => null,
}));

vi.mock("@/components/support/InstallPlatformCard", () => ({
  default: () => null,
}));

vi.mock("@/hooks/useSiteInfo", () => ({
  useSiteInfo: () => ({
    siteName: "测试商城",
    supportDownloadConfig: "{}",
  }),
  useSiteInfoLoaded: () => true,
}));

vi.mock("@/hooks/usePwaInstallPrompt", () => ({
  usePwaInstallPrompt: () => ({
    hasInstallPrompt: false,
    canInstall: false,
    installPromptChecked: true,
    install: vi.fn(),
    installing: false,
    installed: false,
  }),
}));

vi.mock("@/utils/supportDownloadConfig", () => ({
  parseSupportDownloadConfig: () => ({
    enabled: supportConfigState.enabled,
    title: "",
    subtitle: "",
    defaultTab: "support",
    support: {
      enabled: false,
      description: "",
      workingHours: "",
      channels: [],
    },
    download: {
      enabled: false,
      title: "",
      description: "",
      platforms: [],
    },
  }),
  getEnabledSupportChannels: () => [],
  getEnabledDownloadPlatforms: () => [],
}));

vi.mock("@/utils/browserEnv", () => ({
  detectBrowserEnv: () => ({
    platform: "other",
    isInAppBrowser: false,
    isIOS: false,
    isSafari: false,
    isAndroid: false,
  }),
}));

vi.mock("@/utils/seo", () => ({
  buildCanonical: () => "https://example.test/support-download",
}));

vi.mock("@/services/analyticsService", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/components/storefront-motion/useStorefrontNavigate", () => ({
  useStorefrontNavigate: () => vi.fn(),
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

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("SupportDownload wide headers", () => {
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
    supportConfigState.enabled = true;
    vi.clearAllMocks();
  });

  async function renderPage(installMode: boolean) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={[installMode ? "/install" : "/support-download"]}>
          <SupportDownload installMode={installMode} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    return container;
  }

  it.each([
    { label: "enabled support route", enabled: true, installMode: false, expectedCount: 0 },
    { label: "disabled support route", enabled: false, installMode: false, expectedCount: 0 },
    { label: "enabled standalone install route", enabled: true, installMode: true, expectedCount: 1 },
    { label: "disabled standalone install route", enabled: false, installMode: true, expectedCount: 1 },
  ])("renders page-owned wide headers for $label", async ({ enabled, installMode, expectedCount }) => {
    supportConfigState.enabled = enabled;

    const view = await renderPage(installMode);

    expect(view.querySelectorAll('[data-testid="tablet-header"]')).toHaveLength(expectedCount);
    expect(view.querySelectorAll('[data-testid="desktop-header"]')).toHaveLength(expectedCount);
  });
});
