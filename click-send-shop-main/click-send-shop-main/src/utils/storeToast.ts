import type { ExternalToast } from "sonner";

export type StoreToastType = "success" | "error" | "info" | "warning" | "message";

export type StoreToastPayload = {
  type: StoreToastType;
  message: string;
  options?: ExternalToast;
};

type StoreToastListener = (payload: StoreToastPayload) => void;
type StoreToastActivationListener = () => void;

export const STORE_TOAST_EVENT = "storefront:toast";

const pendingToasts: StoreToastPayload[] = [];
const toastListeners = new Set<StoreToastListener>();
const activationListeners = new Set<StoreToastActivationListener>();

function emitStoreToast(payload: StoreToastPayload) {
  if (toastListeners.size > 0) {
    toastListeners.forEach((listener) => listener(payload));
  } else {
    pendingToasts.push(payload);
  }

  activationListeners.forEach((listener) => listener());

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STORE_TOAST_EVENT, { detail: payload }));
  }
}

function show(type: StoreToastType, message: string, options?: ExternalToast) {
  emitStoreToast({ type, message, options });
}

export const showStoreToast = {
  success: (message: string, options?: ExternalToast) => show("success", message, options),
  error: (message: string, options?: ExternalToast) => show("error", message, options),
  info: (message: string, options?: ExternalToast) => show("info", message, options),
  warning: (message: string, options?: ExternalToast) => show("warning", message, options),
  message: (message: string, options?: ExternalToast) => show("message", message, options),
};

export function subscribeStoreToast(listener: StoreToastListener) {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
}

export function subscribeStoreToastActivation(listener: StoreToastActivationListener) {
  activationListeners.add(listener);
  return () => {
    activationListeners.delete(listener);
  };
}

export function drainStoreToastQueue() {
  return pendingToasts.splice(0, pendingToasts.length);
}

export function hasQueuedStoreToasts() {
  return pendingToasts.length > 0;
}
