import type { SiteCapabilities } from "@/types/siteCapabilities";

type StoreNavCapabilitySubset = Pick<
  SiteCapabilities,
  "mallEnabled" | "couponEnabled"
>;

export function isStoreNavPathVisible(path: string, capabilities: StoreNavCapabilitySubset) {
  const base = path.split("?")[0];
  if (["/categories", "/promotions", "/cart"].includes(base)) return capabilities.mallEnabled;
  if (base === "/coupons") return capabilities.couponEnabled;
  if (base === "/support-download") return false;
  return true;
}
