import { get } from "@/api/request";
import { fetchHomeMarketing } from "@/services/homeService";
import { normalizeHomeMarketingCampaigns } from "./campaignNormalize";
import type { StorefrontCampaignVm } from "./campaignTypes";

type CampaignApiPayload = {
  campaigns?: StorefrontCampaignVm[];
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
