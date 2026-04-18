import * as shippingApi from "@/api/modules/shipping";
import type { ShippingTemplate } from "@/types/shipping";

export async function fetchShippingTemplates(): Promise<ShippingTemplate[]> {
  const res = await shippingApi.getShippingTemplates();
  return res.data ?? [];
}

export async function quoteShipping(payload: {
  shipping_template_id: number;
  raw_amount: number;
  estimated_weight_kg?: number;
}) {
  const res = await shippingApi.quoteShipping(payload);
  return res.data;
}
