import * as shippingApi from "@/api/admin/shipping";
import type { ShippingTemplate, ShippingGlobalSettings } from "@/types/shipping";
import { unwrapList } from "@/services/responseNormalize";

export async function fetchTemplates(): Promise<ShippingTemplate[]> {
  const res = await shippingApi.getShippingTemplates();
  return unwrapList<ShippingTemplate>(res.data);
}

export async function createTemplate(data: Omit<ShippingTemplate, "id">) {
  const res = await shippingApi.createShippingTemplate(data);
  return res.data;
}

export async function updateTemplate(id: number, data: Partial<ShippingTemplate>) {
  const res = await shippingApi.updateShippingTemplate(id, data);
  return res.data;
}

export async function deleteTemplate(id: number) {
  await shippingApi.deleteShippingTemplate(id);
}

export async function fetchGlobalSettings() {
  const res = await shippingApi.getGlobalSettings();
  return res.data;
}

export async function updateGlobalSettings(data: ShippingGlobalSettings) {
  const res = await shippingApi.updateGlobalSettings(data);
  return res.data;
}
