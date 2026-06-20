import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicLocaleProvider } from "@/i18n/PublicLocaleProvider";
import { DEFAULT_SITE_CAPABILITIES } from "@/types/siteCapabilities";
import { useStoreNavigationGuard } from "./useStoreNavigationGuard";

const mocks = vi.hoisted(() => ({
  authState: {
    authHydrated: true,
    isAuthenticated: true,
  },
  capabilitiesReady: false,
  loyaltyLoading: false,
  preloadStoreRoute: vi.fn(() => Promise.resolve()),
  toastInfo: vi.fn(),
}));

vi.mock("@/hooks/useSiteCapabilities", () => ({
  useSiteCapabilities: () => DEFAULT_SITE_CAPABILITIES,
  useSiteCapabilitiesReady: () => mocks.capabilitiesReady,
}));

vi.mock("@/hooks/useLoyaltyVisibility", () => ({
  useLoyaltyVisibility: () => ({
    config: null,
    loading: mocks.loyaltyLoading,
  }),
}));

vi.mock("@/stores/useAuthStore", () => ({
  useAuthStore: (selector?: (state: typeof mocks.authState) => unknown) => (
    selector ? selector(mocks.authState) : mocks.authState
  ),
}));

vi.mock("@/utils/storeRoutePreload", () => ({
  preloadStoreRoute: mocks.preloadStoreRoute,
}));

vi.mock("sonner", () => ({
  toast: {
    info: mocks.toastInfo,
  },
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function NavigationProbe() {
  const { navigateFeature, navigateStorePath } = useStoreNavigationGuard();
  return (
    <>
      <button type="button" onClick={() => navigateFeature("notifications")}>
        通知
      </button>
      <button type="button" onClick={() => navigateFeature("memberBenefits")}>
        会员权益
      </button>
      <button type="button" onClick={() => navigateStorePath("/address", { requireAuth: true, from: "/profile" })}>
        地址
      </button>
      <LocationProbe />
    </>
  );
}

describe("useStoreNavigationGuard", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  async function renderNavigationProbe() {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={["/profile"]}>
          <PublicLocaleProvider>
            <NavigationProbe />
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
    mocks.authState.authHydrated = true;
    mocks.authState.isAuthenticated = true;
    mocks.capabilitiesReady = false;
    mocks.loyaltyLoading = false;
    vi.clearAllMocks();
  });

  it("navigates plain account features before capability config is ready", async () => {
    mocks.capabilitiesReady = false;
    await renderNavigationProbe();

    const notificationsButton = container?.querySelector<HTMLButtonElement>("button");
    expect(notificationsButton).not.toBeNull();

    await act(async () => {
      notificationsButton?.click();
    });

    expect(container?.querySelector("[data-testid='location']")?.textContent).toBe("/notifications");
    expect(mocks.toastInfo).not.toHaveBeenCalledWith("功能配置加载中，请稍后再试");
  });

  it("routes capability-backed features while config is loading", async () => {
    mocks.capabilitiesReady = false;
    await renderNavigationProbe();

    const memberButton = [...(container?.querySelectorAll<HTMLButtonElement>("button") ?? [])]
      .find((button) => button.textContent === "会员权益");
    expect(memberButton).not.toBeNull();

    await act(async () => {
      memberButton?.click();
    });

    expect(container?.querySelector("[data-testid='location']")?.textContent).toBe("/member/benefits");
    expect(mocks.toastInfo).not.toHaveBeenCalledWith("功能配置加载中，请稍后再试");
  });

  it("does not route protected targets before auth session hydration finishes", async () => {
    mocks.authState.authHydrated = false;
    await renderNavigationProbe();

    const addressButton = [...(container?.querySelectorAll<HTMLButtonElement>("button") ?? [])]
      .find((button) => button.textContent === "地址");
    expect(addressButton).not.toBeNull();

    await act(async () => {
      addressButton?.click();
    });

    expect(container?.querySelector("[data-testid='location']")?.textContent).toBe("/profile");
    expect(mocks.toastInfo).toHaveBeenCalledWith("登录状态同步中，请稍后再试");
  });
});
