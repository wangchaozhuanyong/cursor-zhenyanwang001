import type { ReactNode } from "react";
import FeatureUnavailable from "@/modules/public/pages/error/FeatureUnavailable";
import RouteStatePanel from "@/modules/storefront-v2/design/components/RouteStatePanel";
import { useSiteCapabilities, useSiteCapabilitiesReady } from "@/hooks/useSiteCapabilities";

export type PublicRouteCapabilities = ReturnType<typeof useSiteCapabilities>;

function CapabilityLoadingState() {
  return (
    <main className="sf-next-page sf-next-route-page sf-next-capability-route-loading" aria-busy="true">
      <RouteStatePanel
        title="正在准备页面"
        description="正在读取商城配置，请稍候。"
      />
    </main>
  );
}

export function CapabilityRoute({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const ready = useSiteCapabilitiesReady();
  if (!ready) return <CapabilityLoadingState />;
  if (!enabled) return <FeatureUnavailable />;
  return <>{children}</>;
}
