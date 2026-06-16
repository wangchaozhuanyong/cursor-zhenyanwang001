import type { SiteCapabilities } from "@/types/siteCapabilities";

type StoreNavCapabilitySubset = Pick<
  SiteCapabilities,
  "mallEnabled" | "couponEnabled" | "pointsEnabled" | "customerServiceDownloadEnabled"
>;

export function isStoreNavPathVisible(path: string, capabilities: StoreNavCapabilitySubset) {
  const base = path.split("?")[0];
  if (["/categories", "/cart"].includes(base)) return capabilities.mallEnabled;
  if (base === "/deals" || base === "/promotions") {
    return capabilities.mallEnabled && (capabilities.couponEnabled || capabilities.pointsEnabled);
  }
  if (base === "/coupons") return capabilities.couponEnabled;
  if (base === "/support-download") return capabilities.customerServiceDownloadEnabled;
  return true;
}
