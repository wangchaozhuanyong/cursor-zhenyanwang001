import { useEffect } from "react";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { configureTracking } from "@/utils/tracking";

export default function TrackingManager() {
  const siteInfo = useSiteInfo();
  const capabilities = useSiteCapabilities();

  useEffect(() => {
    if (!capabilities.trafficAnalyticsEnabled) return;
    configureTracking(siteInfo);
  }, [capabilities.trafficAnalyticsEnabled, siteInfo]);

  return null;
}
