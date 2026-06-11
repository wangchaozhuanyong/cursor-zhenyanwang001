import { useCallback, useMemo } from "react";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import type { SiteInfo, SupportDownloadChannel } from "@/types/content";
import {
  buildSupportPageUrl,
  getEnabledSupportChannels,
  parseSupportDownloadConfig,
  SUPPORT_PAGE_PATH,
} from "@/utils/supportDownloadConfig";
import {
  openCustomerService,
  openSupportChannel,
  type CustomerServiceResult,
} from "@/utils/customerService";

export function useSupportRuntime(siteInfoOverride?: SiteInfo) {
  const siteInfoFromHook = useSiteInfo();
  const siteInfo = siteInfoOverride ?? siteInfoFromHook;
  const capabilities = useSiteCapabilities();

  const config = useMemo(
    () => parseSupportDownloadConfig(siteInfo.supportDownloadConfig),
    [siteInfo.supportDownloadConfig],
  );

  const channels = useMemo(() => getEnabledSupportChannels(config), [config]);

  const capabilityEnabled = capabilities.customerServiceDownloadEnabled;
  const pageEnabled = config.enabled !== false;
  const isAvailable = capabilityEnabled && pageEnabled;
  const hasChannels = channels.length > 0;

  const openPreferred = useCallback((): CustomerServiceResult => {
    return openCustomerService(siteInfo);
  }, [siteInfo]);

  const openChannel = useCallback((channel: SupportDownloadChannel) => {
    return openSupportChannel(channel);
  }, []);

  return {
    siteInfo,
    config,
    channels,
    capabilityEnabled,
    pageEnabled,
    isAvailable,
    hasChannels,
    workingHours: config.support.workingHours?.trim() || "",
    description: config.support.description?.trim() || "",
    pageTitle: config.title,
    pageSubtitle: config.subtitle,
    supportPagePath: SUPPORT_PAGE_PATH,
    buildSupportPageUrl,
    openPreferred,
    openChannel,
  };
}

export type SupportRuntime = ReturnType<typeof useSupportRuntime>;
