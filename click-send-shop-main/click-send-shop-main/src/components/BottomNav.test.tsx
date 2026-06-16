import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import BottomNav from "./BottomNav";
import { PublicLocaleProvider } from "@/i18n/publicLocale";

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

function dispatchPointerDown(target: Element, pointerType: string) {
  const event = new MouseEvent("pointerdown", {
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

  it("navigates on touch pointer down so inertial scrolling cannot swallow the tab switch", async () => {
    await renderBottomNav();

    const cartButton = container?.querySelector<HTMLButtonElement>("button[aria-label='购物车']");
    expect(cartButton).not.toBeNull();

    await act(async () => {
      dispatchPointerDown(cartButton!, "touch");
    });

    expect(container?.querySelector("[data-testid='location']")?.textContent).toBe("/cart");
  });
});
