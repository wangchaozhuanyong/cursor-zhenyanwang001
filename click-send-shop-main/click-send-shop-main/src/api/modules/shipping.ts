import { get, post } from "@/api/request";
import type { ShippingDestination, ShippingTemplate } from "@/types/shipping";

export function getShippingTemplates() {
  return get<ShippingTemplate[]>("/shipping");
}

export function quoteShipping(payload: {
  shipping_template_id: string | number;
  raw_amount: number;
  estimated_weight_kg?: number;
  destination?: ShippingDestination;
}) {
  return post<{ shipping_template_id: string; shipping_name: string; shipping_fee: number; destination?: ShippingDestination }>(
    "/shipping/quote",
    payload,
  );
}
