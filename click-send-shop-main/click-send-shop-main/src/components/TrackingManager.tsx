import { useEffect } from "react";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { configureTracking } from "@/utils/tracking";

export default function TrackingManager() {
  const siteInfo = useSiteInfo();

  useEffect(() => {
    configureTracking(siteInfo);
  }, [siteInfo]);

  return null;
}
