import * as settingsApi from "@/api/admin/settings";
import { uploadAdminSiteAsset } from "@/api/modules/upload";
import type { SiteSettings } from "@/types/admin";

export async function fetchSiteSettings() {
  const res = await settingsApi.getSiteSettings();
  return res.data;
}

export async function updateSiteSettings(data: Partial<SiteSettings>) {
  const res = await settingsApi.updateSiteSettings(data);
  return res.data;
}

export async function uploadSiteAsset(key: "logoUrl" | "faviconUrl", file: File) {
  return uploadAdminSiteAsset(key, file);
}
