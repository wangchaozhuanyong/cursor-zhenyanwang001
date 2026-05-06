import { get, post } from "../request";
import type { ShippingTemplate } from "@/types/shipping";

export function getShippingTemplates() {
  return get<ShippingTemplate[]>("/shipping");
}

export function quoteShipping(payload: {
  shipping_template_id: string;
  raw_amount: number;
  estimated_weight_kg?: number;
}) {
  return post<{ shipping_template_id: string; shipping_name: string; shipping_fee: number }>(
    "/shipping/quote",
    payload,
  );
}
