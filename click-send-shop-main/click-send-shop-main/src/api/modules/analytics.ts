import { post } from "@/api/request";

export type AnalyticsEventPayload = {
  event_type:
    | "session_start"
    | "page_view"
    | "page_leave"
    | "product_impression"
    | "product_click"
    | "product_view"
    | "add_to_cart"
    | "favorite"
    | "coupon_claim"
    | "checkout_start"
    | "order_submit"
    | "payment_success"
    | "search"
    | "category_click"
    | "banner_click"
    | "activity_click"
    | "contact_whatsapp_click"
    | "support_channel_click"
    | "support_qr_view"
    | "support_qr_download"
    | "pwa_download_page_view"
    | "pwa_install_button_shown"
    | "pwa_install_button_clicked"
    | "pwa_installed"
    | "pwa_ios_guide_shown"
    | "pwa_open_standalone"
    | "pwa_update_available"
    | "pwa_update_accepted"
    | "language_check"
    | "non_chinese_blocked"
    | "frontend_chunk_load_failed"
    | "error_404";
  module?: string;
  page?: string;
  path?: string;
  url?: string;
  title?: string;
  product_id?: string;
  variant_id?: string;
  category_id?: string;
  activity_id?: string;
  coupon_id?: string;
  keyword?: string;
  order_id?: string;
  amount?: number;
  quantity?: number;
  session_id?: string;
  anonymous_id?: string;
  dedupe_key?: string;
  referrer?: string;
  referrer_domain?: string;
  traffic_source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  device?: string;
  browser?: string;
  os?: string;
  browser_language?: string;
  screen_width?: number;
  screen_height?: number;
  viewport_width?: number;
  viewport_height?: number;
  duration_ms?: number;
  scroll_depth?: number;
};

export function trackAnalyticsEvent(payload: AnalyticsEventPayload) {
  return post<null>("/analytics/events", payload, { loadingMode: "silent" });
}

export function trackAnalyticsEventsBatch(payloads: AnalyticsEventPayload[]) {
  return post<null>("/analytics/events/batch", { events: payloads }, { loadingMode: "silent" });
}
