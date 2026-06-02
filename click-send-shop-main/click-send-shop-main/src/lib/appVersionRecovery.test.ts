import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAppVersionRecoveryState,
  getAppVersionRecoveryStorageKey,
  installAppVersionRecovery,
  isAppVersionRecoverySuppressed,
  isChunkLoadFailure,
  markAppVersionReady,
  resolveAppVersionRecoveryPlan,
  suppressAppVersionRecovery,
} from "@/lib/appVersionRecovery";

describe("appVersionRecovery", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.__appVersionRecoverySuppressedUntil__ = 0;
    document.body.innerHTML = "";
    window.history.replaceState(null, "", "/?__fresh=123&keep=1");
  });

  it("auto reloads only once inside one recovery window", () => {
    const first = resolveAppVersionRecoveryPlan(null, 1000, "storefront", {
      message: "Failed to fetch dynamically imported module: /assets/page-abc.js",
    });

    expect(first.shouldAutoReload).toBe(true);
    expect(first.isRepeatedFailure).toBe(false);
    expect(first.state.attempts).toBe(1);

    const second = resolveAppVersionRecoveryPlan(first.state, 1500, "storefront", {
      message: "Failed to fetch dynamically imported module: /assets/page-abc.js",
    });

    expect(second.shouldAutoReload).toBe(false);
    expect(second.isRepeatedFailure).toBe(true);
    expect(second.state.attempts).toBe(2);
    expect(second.state.firstAt).toBe(first.state.firstAt);
  });

  it("starts a new auto recovery after the old window expires", () => {
    const previous = resolveAppVersionRecoveryPlan(null, 1000, "storefront").state;
    const later = resolveAppVersionRecoveryPlan(previous, 1000 + 11 * 60 * 1000, "storefront");

    expect(later.shouldAutoReload).toBe(true);
    expect(later.state.attempts).toBe(1);
    expect(later.state.firstAt).toBe(1000 + 11 * 60 * 1000);
  });

  it("keeps storefront and admin recovery keys isolated", () => {
    expect(getAppVersionRecoveryStorageKey("storefront")).toBe("app:version-recovery:storefront");
    expect(getAppVersionRecoveryStorageKey("admin")).toBe("app:version-recovery:admin");
    expect(getAppVersionRecoveryStorageKey("error boundary")).toBe("app:version-recovery:error-boundary");
  });

  it("detects chunk and preload failures without treating API failures as version updates", () => {
    expect(isChunkLoadFailure("Failed to fetch dynamically imported module: /assets/order.js")).toBe(true);
    expect(isChunkLoadFailure({ message: "Unable to preload CSS for /assets/page.css" })).toBe(true);
    expect(isChunkLoadFailure({ message: "Request failed with status code 404 /api/coupons" })).toBe(false);
  });

  it("can suppress automatic recovery while admin routes are only being preloaded", () => {
    expect(isAppVersionRecoverySuppressed(1000)).toBe(false);

    window.__appVersionRecoverySuppressedUntil__ = 1_500;
    expect(isAppVersionRecoverySuppressed(1_499)).toBe(true);
    expect(isAppVersionRecoverySuppressed(1_500)).toBe(false);

    suppressAppVersionRecovery(1_000);
    expect(isAppVersionRecoverySuppressed()).toBe(true);
  });

  it("ignores suppressed Vite preload failures from admin route preloading", () => {
    const dispose = installAppVersionRecovery("admin");

    try {
      suppressAppVersionRecovery(1_000);
      const event = new Event("vite:preloadError") as Event & { payload?: unknown };
      event.payload = { message: "Failed to fetch dynamically imported module: /assets/AdminOrders.js" };

      window.dispatchEvent(event);

      expect(window.__appVersionRecoveryInProgress__).not.toBe(true);
      expect(window.sessionStorage.getItem(getAppVersionRecoveryStorageKey("admin"))).toBeNull();
    } finally {
      dispose();
      window.__appVersionRecoveryInProgress__ = false;
    }
  });

  it("clears old recovery markers once the app is ready", () => {
    window.sessionStorage.setItem("app:chunk-load-recovery", "{}");
    window.sessionStorage.setItem(getAppVersionRecoveryStorageKey("storefront"), "{}");
    window.sessionStorage.setItem(getAppVersionRecoveryStorageKey("admin"), "{}");
    document.body.innerHTML = '<div id="chunk-load-recovery-notice"></div>';

    markAppVersionReady("storefront");

    expect(window.sessionStorage.getItem("app:chunk-load-recovery")).toBeNull();
    expect(window.sessionStorage.getItem(getAppVersionRecoveryStorageKey("storefront"))).toBeNull();
    expect(window.sessionStorage.getItem(getAppVersionRecoveryStorageKey("admin"))).toBeNull();
    expect(document.getElementById("chunk-load-recovery-notice")).toBeNull();
    expect(window.location.search).toBe("?keep=1");
  });

  it("does not throw when clearing state more than once", () => {
    clearAppVersionRecoveryState();
    expect(() => clearAppVersionRecoveryState()).not.toThrow();
  });
});
