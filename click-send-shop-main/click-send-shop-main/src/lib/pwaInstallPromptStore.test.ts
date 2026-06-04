import { beforeEach, describe, expect, it } from "vitest";
import type { DeferredPromptEvent } from "@/utils/pwa";
import {
  clearCapturedPwaInstallPrompt,
  getCapturedPwaInstallPrompt,
  initPwaInstallPromptCapture,
  resetPwaInstallPromptStoreForTest,
  subscribePwaInstallPrompt,
} from "@/lib/pwaInstallPromptStore";

function createInstallPromptEvent(): DeferredPromptEvent {
  return Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: async () => undefined,
    userChoice: Promise.resolve({ outcome: "accepted" as const, platform: "web" }),
  });
}

describe("pwaInstallPromptStore", () => {
  beforeEach(() => {
    resetPwaInstallPromptStoreForTest();
  });

  it("captures beforeinstallprompt before the install page is mounted", () => {
    initPwaInstallPromptCapture();

    const event = createInstallPromptEvent();
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(getCapturedPwaInstallPrompt().deferredPrompt).toBe(event);
    expect(getCapturedPwaInstallPrompt().installPromptChecked).toBe(true);
  });

  it.each([
    "Android Chrome",
    "Samsung Internet",
    "Android Edge",
  ])("keeps the install prompt available for %s after late page mount", () => {
    initPwaInstallPromptCapture();

    const event = createInstallPromptEvent();
    window.dispatchEvent(event);

    let lateSubscriberSawPrompt = false;
    const unsubscribe = subscribePwaInstallPrompt(() => {
      lateSubscriberSawPrompt = getCapturedPwaInstallPrompt().deferredPrompt === event;
    });
    lateSubscriberSawPrompt = getCapturedPwaInstallPrompt().deferredPrompt === event;

    unsubscribe();
    expect(lateSubscriberSawPrompt).toBe(true);
  });

  it("notifies late page state subscribers when the prompt changes", () => {
    initPwaInstallPromptCapture();
    let calls = 0;
    const unsubscribe = subscribePwaInstallPrompt(() => {
      calls += 1;
    });

    window.dispatchEvent(createInstallPromptEvent());
    clearCapturedPwaInstallPrompt();
    unsubscribe();
    window.dispatchEvent(createInstallPromptEvent());

    expect(calls).toBe(2);
    expect(getCapturedPwaInstallPrompt().deferredPrompt).not.toBeNull();
  });
});
