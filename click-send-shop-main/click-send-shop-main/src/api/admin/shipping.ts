import { get, post, put, del } from "../request";
import type { ShippingTemplate, ShippingGlobalSettings } from "@/types/shipping";

export function getShippingTemplates() {
  return get<ShippingTemplate[]>("/admin/shipping/templates");
}

export function createShippingTemplate(data: Omit<ShippingTemplate, "id">) {
  return post<ShippingTemplate>("/admin/shipping/templates", data);
}

export function updateShippingTemplate(id: number, data: Partial<ShippingTemplate>) {
  return put<ShippingTemplate>(`/admin/shipping/templates/${id}`, data);
}

export function deleteShippingTemplate(id: number) {
  return del<void>(`/admin/shipping/templates/${id}`);
}

export function getGlobalSettings() {
  return get<ShippingGlobalSettings>("/admin/shipping/settings");
}

export function updateGlobalSettings(data: ShippingGlobalSettings) {
  return put<ShippingGlobalSettings>("/admin/shipping/settings", data);
}
