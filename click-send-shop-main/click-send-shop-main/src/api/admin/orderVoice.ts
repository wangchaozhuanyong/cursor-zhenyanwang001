import { get, put } from "@/api/request";

export interface AdminOrderVoiceSettings {
  enabled: boolean;
}

export function getAdminOrderVoiceSettings() {
  return get<AdminOrderVoiceSettings>("/admin/account/order-voice");
}

export function updateAdminOrderVoiceSettings(enabled: boolean) {
  return put<AdminOrderVoiceSettings>("/admin/account/order-voice", { enabled });
}
