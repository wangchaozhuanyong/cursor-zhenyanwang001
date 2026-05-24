import type { SiteInfo } from "@/types/content";

function cleanAssetUrl(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** 站点头部/个人中心等：仅使用 Logo（可透明 PNG/WebP） */
export function resolveSiteLogoUrl(siteInfo: Pick<SiteInfo, "logoUrl" | "faviconUrl">): string {
  return cleanAssetUrl(siteInfo.logoUrl);
}

/** 浏览器标签图标：仅使用 Favicon（建议白底方形图，与 Logo 分开上传） */
export function resolveSiteFaviconUrl(siteInfo: Pick<SiteInfo, "logoUrl" | "faviconUrl">): string {
  return cleanAssetUrl(siteInfo.faviconUrl);
}

/** 根据 URL 推断 favicon 的 MIME，供 document link[type] 使用 */
export function guessFaviconMime(url: string): string | undefined {
  const raw = url.trim().toLowerCase();
  if (raw.startsWith("data:image/png")) return "image/png";
  if (raw.startsWith("data:image/webp")) return "image/webp";
  if (raw.startsWith("data:image/")) return undefined;
  const path = raw.split("?")[0];
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".ico")) return "image/x-icon";
  return undefined;
}
