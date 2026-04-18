import { get, put } from "../request";
import type { SiteSettings } from "@/types/admin";

export function getSiteSettings() {
  return get<SiteSettings>("/admin/settings");
}

export function updateSiteSettings(data: Partial<SiteSettings>) {
  return put<SiteSettings>("/admin/settings", data);
}
