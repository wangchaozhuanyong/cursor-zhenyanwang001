import type { LoyaltyConfig } from "@/services/loyaltyService";
import type { SiteCapabilities } from "@/types/siteCapabilities";

export type LoyaltyFeature = "points" | "reward" | "referral";

/** 与路由守卫、Profile 菜单共用的会员功能可见性判定 */
export function isLoyaltyFeatureEnabled(
  feature: LoyaltyFeature,
  capabilities: SiteCapabilities,
  config: LoyaltyConfig | null | undefined,
): boolean {
  if (feature === "points") {
    return capabilities.pointsEnabled && (config?.points?.displayEnabled ?? true);
  }
  if (feature === "reward") {
    return config?.reward?.displayEnabled ?? true;
  }
  return config?.reward?.referralEnabled ?? true;
}
