import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StorefrontCampaignVm } from "./campaignTypes";

const requestMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

const homeServiceMocks = vi.hoisted(() => ({
  fetchHomeMarketing: vi.fn(),
}));

vi.mock("@/api/request", () => requestMocks);
vi.mock("@/services/homeService", () => homeServiceMocks);

import {
  fetchStorefrontCampaigns,
  recordStorefrontCampaignClick,
  recordStorefrontCampaignImpression,
} from "./campaignService";

function campaign(partial: Partial<StorefrontCampaignVm> = {}): StorefrontCampaignVm {
  return {
    id: "campaign-1",
    type: "promotion",
    title: "主活动",
    tone: "primary",
    products: [],
    coupons: [],
    source: "campaign-api",
    ...partial,
  };
}

describe("campaignService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the campaign API when the contract is valid", async () => {
    const apiCampaign = campaign({ id: "api-1", title: "接口活动" });
    requestMocks.get.mockResolvedValue({ data: { campaigns: [apiCampaign] } });

    await expect(fetchStorefrontCampaigns()).resolves.toEqual([apiCampaign]);
    expect(requestMocks.get).toHaveBeenCalledWith("/marketing/campaigns/home");
    expect(homeServiceMocks.fetchHomeMarketing).not.toHaveBeenCalled();
  });

  it("falls back to legacy home marketing when the campaign API fails", async () => {
    requestMocks.get.mockRejectedValue(new Error("network"));
    homeServiceMocks.fetchHomeMarketing.mockResolvedValue({
      fullReductionNotices: [
        {
          id: "full-1",
          title: "满减",
          promo_label: "满100减10",
          start_at: "2026-06-01T00:00:00Z",
          end_at: "2026-06-03T00:00:00Z",
        },
      ],
    });

    const campaigns = await fetchStorefrontCampaigns({ force: true });

    expect(homeServiceMocks.fetchHomeMarketing).toHaveBeenCalledWith({ force: true });
    expect(campaigns).toHaveLength(1);
    expect(campaigns[0]).toMatchObject({
      id: "full-1",
      type: "full_reduction",
      thresholdAmount: 100,
      discountAmount: 10,
    });
  });

  it("records campaign impressions without global loading", async () => {
    requestMocks.post.mockResolvedValue({ data: { accepted: true } });

    await expect(recordStorefrontCampaignImpression("campaign/1", {
      campaignType: "flash_sale",
      position: "home_primary_campaign",
      audience: "guest",
      title: "今日秒杀",
      href: "/categories?activity=flash_sale",
    })).resolves.toBe(true);

    expect(requestMocks.post).toHaveBeenCalledWith(
      "/marketing/campaigns/campaign%2F1/impression",
      expect.objectContaining({
        module: "storefront_campaign",
        position: "home_primary_campaign",
        audience: "guest",
        campaign_type: "flash_sale",
        title: "今日秒杀",
        href: "/categories?activity=flash_sale",
      }),
      expect.objectContaining({
        skipGlobalLoading: true,
        loadingMode: "silent",
        skipAuthRetry: true,
        suppressAuthExpired: true,
      }),
    );
  });

  it("swallows campaign click tracking failures", async () => {
    requestMocks.post.mockRejectedValue(new Error("offline"));

    await expect(recordStorefrontCampaignClick("campaign-1", {
      position: "home_secondary_campaign_1",
      audience: "member",
    })).resolves.toBe(false);
  });
});
