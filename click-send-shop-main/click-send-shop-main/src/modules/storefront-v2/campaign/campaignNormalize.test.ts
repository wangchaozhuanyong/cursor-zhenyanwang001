import { describe, expect, it } from "vitest";
import { buildCampaignProgress, normalizeHomeMarketingCampaigns, parseFullReductionText } from "./campaignNormalize";

describe("campaignNormalize", () => {
  it("parses full reduction labels", () => {
    expect(parseFullReductionText("满100减15")).toEqual({
      thresholdAmount: 100,
      discountAmount: 15,
    });
  });

  it("normalizes home marketing into ordered campaigns", () => {
    const campaigns = normalizeHomeMarketingCampaigns({
      flashSale: {
        id: "flash-1",
        title: "今日秒杀",
        subtitle: "限时",
        start_at: "2026-06-01T00:00:00Z",
        end_at: "2026-06-01T02:00:00Z",
        countdown_seconds: 120,
        items: [
          {
            product_id: "p1",
            product_name: "A",
            cover_image: "/a.jpg",
            original_price: 20,
            flash_price: 10,
            activity_stock: 5,
            sold_count: 1,
            remaining_stock: 4,
            limit_per_user: 1,
          },
        ],
      },
      fullReductionNotices: [
        {
          id: "full-1",
          title: "满减",
          subtitle: "满100减10",
          promo_label: "满100减10",
          start_at: "2026-06-01T00:00:00Z",
          end_at: "2026-06-03T00:00:00Z",
          link_url: "/categories",
        },
      ],
    });

    expect(campaigns.map((campaign) => campaign.type)).toEqual(["flash_sale", "full_reduction"]);
    expect(campaigns[0]?.products[0]?.href).toBe("/product/p1");
    expect(campaigns[1]?.thresholdAmount).toBe(100);
  });

  it("builds cart progress from full reduction campaign", () => {
    const [campaign] = normalizeHomeMarketingCampaigns({
      fullReductionNotices: [
        {
          id: "full-1",
          title: "满减",
          promo_label: "满200减30",
          start_at: "2026-06-01T00:00:00Z",
          end_at: "2026-06-03T00:00:00Z",
        },
      ],
    });

    expect(buildCampaignProgress(campaign, 150)).toEqual({
      reached: false,
      missingAmount: 50,
      thresholdAmount: 200,
      discountAmount: 30,
    });
  });
});
