import type { DeferredPromptEvent } from "@/utils/pwa";

const INSTALL_PROMPT_CHECK_DELAY_MS = 1800;

type InstallPromptListener = () => void;

let initialized = false;
let deferredPrompt: DeferredPromptEvent | null = null;
let installPromptChecked = false;
let checkTimer: number | undefined;
let beforeInstallPromptHandler: ((event: Event) => void) | undefined;
let appInstalledHandler: (() => void) | undefined;
const listeners = new Set<InstallPromptListener>();

function notifyInstallPromptListeners() {
  listeners.forEach((listener) => listener());
}

export function initPwaInstallPromptCapture() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  beforeInstallPromptHandler = (event: Event) => {
    event.preventDefault();
    deferredPrompt = event as DeferredPromptEvent;
    installPromptChecked = true;
    notifyInstallPromptListeners();
  };

  appInstalledHandler = () => {
    deferredPrompt = null;
    installPromptChecked = true;
    notifyInstallPromptListeners();
  };

  window.addEventListener("beforeinstallprompt", beforeInstallPromptHandler);
  window.addEventListener("appinstalled", appInstalledHandler);

  checkTimer = window.setTimeout(() => {
    installPromptChecked = true;
    notifyInstallPromptListeners();
  }, INSTALL_PROMPT_CHECK_DELAY_MS);
}

export function getCapturedPwaInstallPrompt() {
  return {
    deferredPrompt,
    installPromptChecked,
  };
}

export function clearCapturedPwaInstallPrompt() {
  deferredPrompt = null;
  installPromptChecked = true;
  notifyInstallPromptListeners();
}

export function subscribePwaInstallPrompt(listener: InstallPromptListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetPwaInstallPromptStoreForTest() {
  if (typeof window !== "undefined" && beforeInstallPromptHandler) {
    window.removeEventListener("beforeinstallprompt", beforeInstallPromptHandler);
  }
  if (typeof window !== "undefined" && appInstalledHandler) {
    window.removeEventListener("appinstalled", appInstalledHandler);
  }
  if (typeof window !== "undefined" && checkTimer !== undefined) {
    window.clearTimeout(checkTimer);
  }
  initialized = false;
  deferredPrompt = null;
  installPromptChecked = false;
  checkTimer = undefined;
  beforeInstallPromptHandler = undefined;
  appInstalledHandler = undefined;
  listeners.clear();
}
