import type { SiteCapabilities } from "@/types/siteCapabilities";

type StoreNavCapabilitySubset = Pick<
  SiteCapabilities,
  "mallEnabled" | "customerServiceDownloadEnabled"
>;

export function isStoreNavPathVisible(path: string, capabilities: StoreNavCapabilitySubset) {
  const base = path.split("?")[0];
  if (["/categories", "/cart"].includes(base)) return capabilities.mallEnabled;
  if (base === "/support-download") return capabilities.customerServiceDownloadEnabled;
  return true;
}
