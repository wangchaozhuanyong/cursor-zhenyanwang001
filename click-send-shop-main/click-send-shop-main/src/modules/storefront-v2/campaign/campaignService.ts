import { get, post } from "@/api/request";
import { fetchHomeMarketing } from "@/services/homeService";
import { normalizeHomeMarketingCampaigns } from "./campaignNormalize";
import type { StorefrontCampaignType, StorefrontCampaignVm } from "./campaignTypes";

type CampaignApiPayload = {
  campaigns?: StorefrontCampaignVm[];
};

type CampaignEventAction = "impression" | "click";

export type StorefrontCampaignEventContext = {
  campaignType?: StorefrontCampaignType;
  position?: string;
  audience?: "guest" | "member";
  sourcePath?: string;
  title?: string;
  href?: string;
};

type CampaignEventResponse = {
  accepted?: boolean;
};

export async function fetchStorefrontCampaigns(options?: { force?: boolean }): Promise<StorefrontCampaignVm[]> {
  const fallback = async () => normalizeHomeMarketingCampaigns(await fetchHomeMarketing(options));

  try {
    const res = await get<CampaignApiPayload>("/marketing/campaigns/home");
    if (Array.isArray(res.data?.campaigns)) return res.data.campaigns;
    return fallback();
  } catch {
    return fallback();
  }
}

export async function fetchPrimaryFullReductionCampaign(options?: { force?: boolean }) {
  const campaigns = await fetchStorefrontCampaigns(options);
  return campaigns.find((campaign) => campaign.type === "full_reduction") ?? null;
}

function currentBrowserPath() {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}`;
}

function buildCampaignEventBody(context: StorefrontCampaignEventContext = {}) {
  const sourcePath = context.sourcePath || currentBrowserPath();
  return {
    module: "storefront_campaign",
    page: sourcePath,
    path: sourcePath,
    source_path: sourcePath,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    title: context.title,
    position: context.position,
    audience: context.audience,
    campaign_type: context.campaignType,
    href: context.href,
  };
}

async function recordStorefrontCampaignEvent(
  campaignId: string,
  action: CampaignEventAction,
  context?: StorefrontCampaignEventContext,
) {
  const id = campaignId.trim();
  if (!id) return false;
  try {
    const res = await post<CampaignEventResponse>(
      `/marketing/campaigns/${encodeURIComponent(id)}/${action}`,
      buildCampaignEventBody(context),
      {
        skipGlobalLoading: true,
        loadingMode: "silent",
        timeoutMs: 8000,
        skipAuthRetry: true,
        suppressAuthExpired: true,
      },
    );
    return res.data?.accepted === true;
  } catch {
    return false;
  }
}

export function recordStorefrontCampaignImpression(campaignId: string, context?: StorefrontCampaignEventContext) {
  return recordStorefrontCampaignEvent(campaignId, "impression", context);
}

export function recordStorefrontCampaignClick(campaignId: string, context?: StorefrontCampaignEventContext) {
  return recordStorefrontCampaignEvent(campaignId, "click", context);
}
