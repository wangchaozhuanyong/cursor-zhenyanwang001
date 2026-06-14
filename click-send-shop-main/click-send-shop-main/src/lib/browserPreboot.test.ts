import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const PREBOOT_SOURCE = readFileSync("public/browser-preboot.js", "utf8");
const RECOVERY_NOTICE_ID = "chunk-load-recovery-notice";

type RecoveryWindow = Window & {
  __appVersionRecoveryInProgress__?: boolean;
  __appVersionRecoverySuppressedUntil__?: number;
};

describe("browser-preboot", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-app-boot");
    document.documentElement.removeAttribute("data-preboot");
    document.body.innerHTML = '<div id="root" data-boot-status="ok"></div>';
    window.sessionStorage.clear();

    const recoveryWindow = window as RecoveryWindow;
    recoveryWindow.__appVersionRecoveryInProgress__ = false;
    recoveryWindow.__appVersionRecoverySuppressedUntil__ = 0;

    Object.defineProperty(window, "fetch", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("does not take over runtime preload errors after the app has booted", () => {
    window.eval(PREBOOT_SOURCE);
    document.documentElement.setAttribute("data-app-boot", "ok");

    const event = new Event("vite:preloadError", { cancelable: true }) as Event & { payload?: unknown };
    event.payload = { message: "Failed to fetch dynamically imported module: /assets/Orders-old.js" };

    window.dispatchEvent(event);

    expect(document.getElementById(RECOVERY_NOTICE_ID)).toBeNull();
    expect((window as RecoveryWindow).__appVersionRecoveryInProgress__).not.toBe(true);
    expect(event.defaultPrevented).toBe(false);
  });
});
