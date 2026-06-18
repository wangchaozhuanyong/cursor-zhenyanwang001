import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import BottomNav from "./BottomNav";
import { PublicLocaleProvider } from "@/i18n/PublicLocaleProvider";

vi.mock("@/contexts/ThemeRuntimeProvider", () => ({
  useThemeRuntime: () => ({
    themeConfig: {
      navStyle: "clean",
    },
  }),
}));

vi.mock("@/hooks/useSiteCapabilities", () => ({
  useSiteCapabilities: () => ({
    mallEnabled: true,
    serviceEnabled: true,
    onlinePaymentEnabled: true,
    pointsEnabled: true,
    couponEnabled: true,
    reviewEnabled: true,
    inventoryEnabled: true,
    shippingEnabled: true,
    memberLevelEnabled: true,
    customerServiceDownloadEnabled: true,
    telegramOrderNotifyEnabled: true,
    languageGateEnabled: false,
    storefrontMultilingualEnabled: false,
    restrictedProductComplianceEnabled: true,
    trafficAnalyticsEnabled: false,
    downloadConfirmEnabled: false,
  }),
}));

vi.mock("@/components/store/DeferredStoreCartBadge", () => ({
  default: () => null,
}));

vi.mock("@/utils/storeRoutePreload", () => ({
  preloadStoreRoute: vi.fn(),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function dispatchPointerEvent(target: Element, type: "pointerdown" | "pointerup", pointerType: string) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: 24,
    clientY: 24,
  });
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    pointerType: { value: pointerType },
  });
  target.dispatchEvent(event);
}

describe("BottomNav", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  async function renderBottomNav(initialPath = "/new-arrivals") {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={[initialPath]}>
          <PublicLocaleProvider>
            <BottomNav />
            <LocationProbe />
          </PublicLocaleProvider>
        </MemoryRouter>,
      );
    });
  }

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

  it("keeps the main tab bar visible and clickable on scrolled tab pages", async () => {
    await renderBottomNav();

    const navClassName = container?.querySelector(".store-bottom-nav")?.className ?? "";
    expect(navClassName).toContain("translate-y-0");
    expect(navClassName).toContain("opacity-100");
    expect(navClassName).not.toContain("pointer-events-none");
  });

  it("warms and highlights on touch down, then navigates after a confirmed tap", async () => {
    await renderBottomNav();

    const dealsButton = container?.querySelector<HTMLButtonElement>("button[aria-label='优惠活动']");
    expect(dealsButton).not.toBeNull();

    await act(async () => {
      dispatchPointerEvent(dealsButton!, "pointerdown", "touch");
    });

    expect(container?.querySelector("[data-testid='location']")?.textContent).toBe("/new-arrivals");

    await act(async () => {
      dispatchPointerEvent(dealsButton!, "pointerup", "touch");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container?.querySelector("[data-testid='location']")?.textContent).toBe("/promotions");
  });
});
