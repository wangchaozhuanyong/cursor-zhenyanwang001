import { get, put } from "@/api/request";
import type { SiteSettings } from "@/types/admin";
import type { SiteCapabilities } from "@/types/siteCapabilities";

export function getSiteSettings() {
  return get<SiteSettings>("/admin/settings");
}

/** 局部更新：仅提交 body 中出现的 key，后端按 key upsert */
export function updateSiteSettings(data: Partial<SiteSettings>) {
  return put<SiteSettings>("/admin/settings", data);
}

export function getSiteCapabilities() {
  return get<SiteCapabilities>("/admin/settings/features");
}

export function updateSiteCapabilities(data: SiteCapabilities) {
  return put<SiteCapabilities>("/admin/settings/features", data);
}

