import * as settingsApi from "@/api/admin/settings";
import type { SiteSettings } from "@/types/admin";

export async function fetchSiteSettings() {
  const res = await settingsApi.getSiteSettings();
  return res.data;
}

export async function updateSiteSettings(data: Partial<SiteSettings>) {
  const res = await settingsApi.updateSiteSettings(data);
  return res.data;
}
