import { post } from "@/api/request";

export type AnalyticsEventPayload = {
  event_type:
    | "page_view"
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
    | "activity_click";
  module?: string;
  page?: string;
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
};

export function trackAnalyticsEvent(payload: AnalyticsEventPayload) {
  return post<null>("/analytics/events", payload);
}

