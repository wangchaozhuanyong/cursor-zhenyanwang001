import type { CartItem } from "@/types/cart";
import type { Order } from "@/types/order";
import type { Product } from "@/types/product";
import type { SiteInfo } from "@/types/content";
import { getTrackingConsent, subscribeTrackingConsent } from "@/utils/trackingConsent";

type TrackingConfig = {
  ga4MeasurementId?: string;
  ga4Enabled?: boolean;
  metaPixelId?: string;
  metaPixelEnabled?: boolean;
};

type EcommerceItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

let currentConfig: TrackingConfig = {};
let initialized = false;
let gaLoadedFor = "";
let metaLoadedFor = "";
const pendingGaEvents: Array<{ eventName: string; params: Record<string, unknown> }> = [];
const pendingMetaEvents: Array<{ eventName: string; params: Record<string, unknown>; options?: Record<string, unknown> }> = [];

function settingEnabled(value: unknown) {
  return value === true || value === "1" || value === "true" || value === "enabled";
}

function normalizeConfig(siteInfo: SiteInfo): TrackingConfig {
  return {
    ga4MeasurementId: (siteInfo.ga4MeasurementId || "").trim(),
    ga4Enabled: settingEnabled(siteInfo.ga4Enabled),
    metaPixelId: (siteInfo.metaPixelId || "").trim(),
    metaPixelEnabled: settingEnabled(siteInfo.metaPixelEnabled),
  };
}

function ensureScript(id: string, src: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function loadGa4(measurementId: string) {
  if (!measurementId || gaLoadedFor === measurementId) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtagShim(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: true });
  ensureScript("tracking-ga4", `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`);
  gaLoadedFor = measurementId;
  flushPendingEvents();
}

function loadMetaPixel(pixelId: string) {
  if (!pixelId || metaLoadedFor === pixelId) return;
  if (!window.fbq) {
    const fbq = function fbqShim(...args: unknown[]) {
      fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args);
    } as Window["fbq"] & { queue: unknown[]; loaded: boolean; version: string; callMethod?: (...args: unknown[]) => void };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = fbq;
    window._fbq = fbq;
  }
  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
  ensureScript("tracking-meta-pixel", "https://connect.facebook.net/en_US/fbevents.js");
  metaLoadedFor = pixelId;
  flushPendingEvents();
}

function applyTrackingConsent() {
  if (typeof document === "undefined") return;
  const consent = getTrackingConsent();
  if (!consent) return;
  if (currentConfig.ga4Enabled && currentConfig.ga4MeasurementId && consent.preferences.analytics) {
    loadGa4(currentConfig.ga4MeasurementId);
  }
  if (currentConfig.metaPixelEnabled && currentConfig.metaPixelId && consent.preferences.ads) {
    loadMetaPixel(currentConfig.metaPixelId);
  }
}

function enqueueLimited<T>(queue: T[], item: T) {
  queue.push(item);
  if (queue.length > 20) queue.shift();
}

function flushPendingEvents() {
  if (window.gtag && getTrackingConsent()?.preferences.analytics) {
    while (pendingGaEvents.length) {
      const event = pendingGaEvents.shift();
      if (event) window.gtag("event", event.eventName, event.params);
    }
  }
  if (window.fbq && getTrackingConsent()?.preferences.ads) {
    while (pendingMetaEvents.length) {
      const event = pendingMetaEvents.shift();
      if (!event) continue;
      if (event.options) {
        window.fbq("track", event.eventName, event.params, event.options);
      } else {
        window.fbq("track", event.eventName, event.params);
      }
    }
  }
}

export function configureTracking(siteInfo: SiteInfo) {
  currentConfig = normalizeConfig(siteInfo);
  applyTrackingConsent();
  if (!initialized) {
    initialized = true;
    subscribeTrackingConsent(() => applyTrackingConsent());
  }
}

function toGaItem(product: Product, quantity?: number): EcommerceItem {
  return {
    item_id: product.id,
    item_name: product.name,
    price: Number(product.price) || 0,
    quantity,
  };
}

function orderItems(order: Order): EcommerceItem[] {
  return order.items.map((item) => toGaItem(item.product, item.qty));
}

function trackGa(eventName: string, params: Record<string, unknown>) {
  if (!getTrackingConsent()?.preferences.analytics) return;
  if (!window.gtag) {
    enqueueLimited(pendingGaEvents, { eventName, params });
    applyTrackingConsent();
    return;
  }
  window.gtag("event", eventName, params);
}

function trackMeta(eventName: string, params: Record<string, unknown>, options?: Record<string, unknown>) {
  if (!getTrackingConsent()?.preferences.ads) return;
  if (!window.fbq) {
    enqueueLimited(pendingMetaEvents, { eventName, params, options });
    applyTrackingConsent();
    return;
  }
  if (options) {
    window.fbq("track", eventName, params, options);
  } else {
    window.fbq("track", eventName, params);
  }
}

export function trackProductView(product: Product) {
  const value = Number(product.price) || 0;
  trackGa("view_item", {
    currency: "MYR",
    value,
    items: [toGaItem(product)],
  });
  trackMeta("ViewContent", {
    content_ids: [product.id],
    content_name: product.name,
    content_type: "product",
    currency: "MYR",
    value,
  });
}

export function trackAddToCart(product: Product, quantity = 1) {
  const value = (Number(product.price) || 0) * quantity;
  trackGa("add_to_cart", {
    currency: "MYR",
    value,
    items: [toGaItem(product, quantity)],
  });
  trackMeta("AddToCart", {
    content_ids: [product.id],
    content_name: product.name,
    content_type: "product",
    currency: "MYR",
    value,
  });
}

export function trackBeginCheckout(items: CartItem[], value: number) {
  trackGa("begin_checkout", {
    currency: "MYR",
    value,
    items: items.map((item) => toGaItem(item.product, item.qty)),
  });
  trackMeta("InitiateCheckout", {
    content_ids: items.map((item) => item.product.id),
    content_type: "product",
    currency: "MYR",
    num_items: items.reduce((sum, item) => sum + item.qty, 0),
    value,
  });
}

export function trackPurchase(order: Order) {
  if (typeof window === "undefined") return;
  const consent = getTrackingConsent();
  if (!consent?.preferences.analytics && !consent?.preferences.ads) return;
  const dedupeKey = `tracking-purchase:${order.id}`;
  if (window.localStorage.getItem(dedupeKey)) return;
  window.localStorage.setItem(dedupeKey, new Date().toISOString());

  const value = Number(order.total_amount) || 0;
  const eventId = `purchase-${order.id}`;
  trackGa("purchase", {
    transaction_id: order.order_no || order.id,
    currency: "MYR",
    value,
    shipping: Number(order.shipping_fee) || 0,
    coupon: order.coupon_title || undefined,
    items: orderItems(order),
  });
  trackMeta("Purchase", {
    content_ids: order.items.map((item) => item.product.id),
    content_type: "product",
    currency: "MYR",
    num_items: order.items.reduce((sum, item) => sum + item.qty, 0),
    value,
  }, { eventID: eventId });
}
