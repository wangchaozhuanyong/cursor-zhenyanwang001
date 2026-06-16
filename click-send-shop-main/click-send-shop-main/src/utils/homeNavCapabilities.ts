import type { HomeNavItem } from "@/types/content";
import type { SiteCapabilities } from "@/types/siteCapabilities";

const MALL_PATH_PREFIXES = [
  "/categories",
  "/new-arrivals",
  "/search",
  "/cart",
  "/checkout",
] as const;

function pathBase(link: string | undefined): string {
  const raw = (link || "").trim();
  if (!raw || /^https?:\/\//i.test(raw)) return "";
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return path.split("?")[0].split("#")[0];
}

function requiresMall(item: HomeNavItem): boolean {
  if (item.target_type === "categories" || item.target_type === "category") return true;
  const base = pathBase(item.link_url);
  if (!base) return false;
  if (MALL_PATH_PREFIXES.includes(base as (typeof MALL_PATH_PREFIXES)[number])) return true;
  return base.startsWith("/product/");
}

/** Whether a home nav item should be shown given site capability switches (aligned with CapabilityRoute). */
export function isHomeNavItemVisible(item: HomeNavItem, caps: SiteCapabilities): boolean {
  if (item.enabled === false) return false;

  if (item.target_type === "support") {
    return false;
  }
  if (requiresMall(item)) {
    return caps.mallEnabled;
  }

  const base = pathBase(item.link_url);
  if (base.startsWith("/deals") || base.startsWith("/promotions")) {
    return caps.mallEnabled && (caps.couponEnabled || caps.pointsEnabled);
  }
  if (base.startsWith("/coupons")) return caps.couponEnabled;
  if (base.startsWith("/support-download")) return false;
  if (base.startsWith("/points")) return caps.pointsEnabled;
  if (base.startsWith("/reviews")) return caps.reviewEnabled;

  return true;
}

export function filterVisibleHomeNavItems(
  items: HomeNavItem[],
  caps: SiteCapabilities,
): HomeNavItem[] {
  return items.filter((item) => isHomeNavItemVisible(item, caps));
}
