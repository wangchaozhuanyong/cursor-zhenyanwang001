import type { SiteInfo } from "@/types/content";

function cleanAssetUrl(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function resolveSiteLogoUrl(siteInfo: Pick<SiteInfo, "logoUrl" | "faviconUrl">): string {
  return cleanAssetUrl(siteInfo.logoUrl) || cleanAssetUrl(siteInfo.faviconUrl);
}

export function resolveSiteFaviconUrl(siteInfo: Pick<SiteInfo, "logoUrl" | "faviconUrl">): string {
  return cleanAssetUrl(siteInfo.logoUrl) || cleanAssetUrl(siteInfo.faviconUrl);
}
