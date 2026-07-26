import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
import { usePublicLocale } from "@/i18n/publicLocale";
import RouteStatePanel from "@/modules/storefront-v2/design/components/RouteStatePanel";
import { isLoyaltyFeatureEnabled } from "@/utils/loyaltyFeatureVisibility";

function LoyaltyFeatureLoadingState({ feature }: { feature: "points" | "reward" | "referral" }) {
  const label = feature === "points" ? "积分" : feature === "referral" ? "邀请奖励" : "返现奖励";
  return (
    <main className="sf-next-page sf-next-route-page sf-next-loyalty-route-loading" aria-busy="true">
      <RouteStatePanel
        title={`正在同步${label}`}
        description="系统正在读取后台会员功能配置，请稍候。"
      />
    </main>
  );
}

export function LoyaltyRouteGuard({ feature, children }: { feature: "points" | "reward" | "referral"; children: ReactNode }) {
  const capabilities = useSiteCapabilities();
  const { localizedPath } = usePublicLocale();
  const { config, loading } = useLoyaltyVisibility();
  const enabled = isLoyaltyFeatureEnabled(feature, capabilities, config);
  if (loading) return <LoyaltyFeatureLoadingState feature={feature} />;
  if (!enabled) return <Navigate to={localizedPath("/profile")} replace />;
  return <>{children}</>;
}
