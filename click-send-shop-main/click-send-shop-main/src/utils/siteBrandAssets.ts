import type { SiteInfo } from "@/types/content";

export const SITE_BRAND_FAVICON_STORAGE_KEY = "site:brand:favicon";
export const SITE_BRAND_FAVICON_STORAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function cleanAssetUrl(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildAssetVersion(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

export function appendBrandAssetVersion(url: string, versionSource = url): string {
  const cleanUrl = cleanAssetUrl(url);
  if (!cleanUrl || cleanUrl.startsWith("data:")) return cleanUrl;
  if (/[?&](?:v|brand_v)=/.test(cleanUrl)) return cleanUrl;
  const version = buildAssetVersion(versionSource || cleanUrl);
  const separator = cleanUrl.includes("?") ? "&" : "?";
  return `${cleanUrl}${separator}v=${version}`;
}

export function resolveSiteLogoUrl(siteInfo: Pick<SiteInfo, "logoUrl" | "faviconUrl">): string {
  return cleanAssetUrl(siteInfo.logoUrl) || cleanAssetUrl(siteInfo.faviconUrl);
}

export function resolveSiteFaviconUrl(siteInfo: Pick<SiteInfo, "logoUrl" | "faviconUrl">): string {
  return cleanAssetUrl(siteInfo.faviconUrl) || cleanAssetUrl(siteInfo.logoUrl);
}

function resolveCustomSiteFaviconUrl(siteInfo: Pick<SiteInfo, "logoUrl" | "faviconUrl">): string {
  const raw = resolveSiteFaviconUrl(siteInfo);
  return raw && !/lovable/i.test(raw) ? appendBrandAssetVersion(raw) : "";
}

export function parseStoredSiteFaviconUrl(raw: string | null, now = Date.now()): string {
  const value = cleanAssetUrl(raw);
  if (!value) return "";
  try {
    const payload = JSON.parse(value) as { href?: unknown; savedAt?: unknown };
    const href = cleanAssetUrl(payload.href);
    const savedAt = Number(payload.savedAt || 0);
    if (!href || !savedAt || now - savedAt > SITE_BRAND_FAVICON_STORAGE_TTL_MS) return "";
    return href;
  } catch {
    return "";
  }
}

export function rememberSiteFaviconUrl(siteInfo: Pick<SiteInfo, "logoUrl" | "faviconUrl">): void {
  if (typeof window === "undefined") return;
  const custom = resolveCustomSiteFaviconUrl(siteInfo);
  try {
    if (custom && custom.length <= 100_000) {
      window.localStorage.setItem(
        SITE_BRAND_FAVICON_STORAGE_KEY,
        JSON.stringify({ href: custom, savedAt: Date.now() }),
      );
    } else {
      window.localStorage.removeItem(SITE_BRAND_FAVICON_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures; favicon sync still works for the current page.
  }
}

export type SiteFaviconLinkTarget = {
  rel: string;
  href: string;
  type?: string;
  sizes?: string;
};

export type DefaultSiteFaviconAssets = {
  svg: string;
  png: string;
  ico: string;
  appleTouchIcon: string;
};

export function buildSiteFaviconLinkTargets(
  siteInfo: Pick<SiteInfo, "logoUrl" | "faviconUrl">,
  defaults: DefaultSiteFaviconAssets,
): SiteFaviconLinkTarget[] {
  const raw = resolveSiteFaviconUrl(siteInfo);
  const custom = resolveCustomSiteFaviconUrl(siteInfo);
  const faviconType = custom ? guessFaviconMime(custom) : undefined;
  const needsPngFallback = faviconType === "image/webp";
  const pwaPngFallback = appendBrandAssetVersion("/api/pwa/icon-192x192.png", raw);
  const actionIcon = needsPngFallback ? pwaPngFallback : custom;
  const actionIconType = needsPngFallback ? "image/png" : faviconType;
  const customSizes =
    faviconType === "image/svg+xml"
      ? "any"
      : faviconType === "image/png" || faviconType === "image/webp"
        ? "192x192"
        : undefined;

  if (!custom) {
    return [
      { rel: "icon", href: defaults.svg, type: "image/svg+xml" },
      { rel: "icon", href: defaults.png, type: "image/png", sizes: "32x32" },
      { rel: "shortcut icon", href: defaults.ico },
      { rel: "apple-touch-icon", href: defaults.appleTouchIcon },
    ];
  }

  return [
    { rel: "icon", href: custom, type: faviconType, sizes: customSizes },
    ...(needsPngFallback
      ? [{ rel: "icon", href: pwaPngFallback, type: "image/png", sizes: "192x192" }]
      : []),
    { rel: "shortcut icon", href: actionIcon, type: actionIconType },
    { rel: "apple-touch-icon", href: actionIcon, type: actionIconType, sizes: "180x180" },
  ];
}

export function guessFaviconMime(url: string): string | undefined {
  const raw = url.trim().toLowerCase();
  if (raw.startsWith("data:image/png")) return "image/png";
  if (raw.startsWith("data:image/webp")) return "image/webp";
  if (raw.startsWith("data:image/svg+xml")) return "image/svg+xml";
  if (raw.startsWith("data:image/")) return undefined;
  const path = raw.split("?")[0];
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".ico")) return "image/x-icon";
  return undefined;
}
