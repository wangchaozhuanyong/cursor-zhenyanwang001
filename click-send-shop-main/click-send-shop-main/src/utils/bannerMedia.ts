import type { Banner } from "@/types/banner";

const STATIC_HOME_BANNER_RE = /^(.*\/assets\/home-banners\/home-hero-\d{2}-[^?#]+?)(-mobile)?(\.webp)(\?.*)?$/i;

export type BannerPictureSource = {
  media: string;
  srcSet: string;
};

export type ResolvedBannerMedia = {
  src: string;
  mobileSrc: string;
  desktopSrc: string;
  preloadSrc: string;
  sources: BannerPictureSource[];
  sourceKey: string;
};

type ResolveBannerMediaOptions = {
  compactViewport?: boolean;
  staticAssetVersion?: string;
};

function appendStaticAssetVersion(url: string, version: string): string {
  if (!version || !url || /[?&]hbv=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}hbv=${encodeURIComponent(version)}`;
}

function resolveLegacyStaticPair(image: string, version: string) {
  const match = image.match(STATIC_HOME_BANNER_RE);
  if (!match) return { mobile: "", desktop: image };

  const [, base, , extension, query = ""] = match;
  return {
    mobile: appendStaticAssetVersion(`${base}-mobile${extension}${query}`, version),
    desktop: appendStaticAssetVersion(`${base}${extension}${query}`, version),
  };
}

function isCompactViewport() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

export function resolveBannerMedia(
  banner?: Banner | null,
  options: ResolveBannerMediaOptions = {},
): ResolvedBannerMedia {
  if (!banner) {
    return {
      src: "",
      mobileSrc: "",
      desktopSrc: "",
      preloadSrc: "",
      sources: [],
      sourceKey: "",
    };
  }

  const legacy = String(banner.image || "").trim();
  const explicitMobile = String(banner.image_mobile || "").trim();
  const explicitDesktop = String(banner.image_desktop || "").trim();
  const staticPair = !explicitMobile && !explicitDesktop
    ? resolveLegacyStaticPair(legacy, String(options.staticAssetVersion || "").trim())
    : { mobile: "", desktop: "" };
  const desktopSrc = explicitDesktop || staticPair.desktop || legacy || explicitMobile;
  const mobileSrc = explicitMobile || staticPair.mobile || legacy || desktopSrc;
  const src = desktopSrc || mobileSrc;
  const sources = mobileSrc && mobileSrc !== src
    ? [{ media: "(max-width: 767px)", srcSet: mobileSrc }]
    : [];
  const compactViewport = options.compactViewport ?? isCompactViewport();
  const preloadSrc = compactViewport ? (mobileSrc || src) : src;
  const sourceKey = sources.map((source) => `${source.media}:${source.srcSet}`).join("|");

  return {
    src,
    mobileSrc,
    desktopSrc: src,
    preloadSrc,
    sources,
    sourceKey,
  };
}
