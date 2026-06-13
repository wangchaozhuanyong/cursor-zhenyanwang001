import type { FlashSaleHomeActivity } from "@/api/modules/marketing";
import type {
  CouponCenterPayload,
  CouponZonePayload,
  MarketingActivitySummary,
  MarketingCouponPublic,
  NewUserGiftPayload,
} from "@/services/marketingService";
import type {
  CampaignProgress,
  StorefrontCampaignCoupon,
  StorefrontCampaignTone,
  StorefrontCampaignType,
  StorefrontCampaignVm,
} from "./campaignTypes";

type HomeMarketingPayload = {
  flashSale?: unknown;
  promotionBanners?: unknown[];
  fullReductionNotices?: unknown[];
  couponZone?: unknown;
  couponCenter?: unknown;
  newUserGift?: unknown;
};

type ActivityLike = Partial<MarketingActivitySummary> & {
  campaign_type?: string;
  issue_mode?: string;
  coupons?: MarketingCouponPublic[];
};

const CAMPAIGN_TONE: Record<StorefrontCampaignType, StorefrontCampaignTone> = {
  flash_sale: "danger",
  full_reduction: "price",
  coupon: "success",
  new_user_gift: "primary",
  promotion: "primary",
  notice: "neutral",
};

export function normalizeHomeMarketingCampaigns(marketing: HomeMarketingPayload | null | undefined): StorefrontCampaignVm[] {
  if (!marketing) return [];

  const campaigns: StorefrontCampaignVm[] = [];
  const flashSale = normalizeFlashSale(marketing.flashSale);
  if (flashSale) campaigns.push(flashSale);

  for (const item of asArray(marketing.fullReductionNotices)) {
    const campaign = normalizeSummaryCampaign(item, "full_reduction");
    if (campaign) campaigns.push(campaign);
  }

  const couponCenter = normalizeCouponCenter(marketing.couponCenter);
  if (couponCenter) campaigns.push(couponCenter);

  const couponZone = normalizeCouponZone(marketing.couponZone);
  campaigns.push(...couponZone);

  const newUserGift = normalizeNewUserGift(marketing.newUserGift);
  if (newUserGift) campaigns.push(newUserGift);

  for (const item of asArray(marketing.promotionBanners)) {
    const campaign = normalizeSummaryCampaign(item, "promotion");
    if (campaign) campaigns.push(campaign);
  }

  return dedupeCampaigns(campaigns);
}

export function parseFullReductionText(text: string | null | undefined) {
  if (!text) return {};
  const normalized = String(text).replace(/\s+/g, "");
  const matched = normalized.match(/满([0-9]+(?:\.[0-9]+)?)减([0-9]+(?:\.[0-9]+)?)/);
  if (!matched) return {};
  return {
    thresholdAmount: Number(matched[1]),
    discountAmount: Number(matched[2]),
  };
}

export function buildCampaignProgress(campaign: StorefrontCampaignVm | null | undefined, amount: number): CampaignProgress | null {
  if (!campaign || campaign.type !== "full_reduction" || !campaign.thresholdAmount) return null;
  const currentAmount = Math.max(0, Number(amount) || 0);
  const thresholdAmount = Number(campaign.thresholdAmount);
  const missingAmount = Math.max(0, thresholdAmount - currentAmount);

  return {
    reached: missingAmount <= 0,
    missingAmount,
    thresholdAmount,
    discountAmount: campaign.discountAmount,
  };
}

function normalizeFlashSale(value: unknown): StorefrontCampaignVm | null {
  const activity = value as Partial<FlashSaleHomeActivity> | null;
  if (!activity || !activity.id || !activity.title) return null;

  return {
    id: activity.id,
    type: "flash_sale",
    title: activity.title,
    subtitle: activity.subtitle,
    coverImage: activity.cover_image,
    href: "/categories?activity=flash_sale",
    startsAt: activity.start_at,
    endsAt: activity.end_at,
    countdownSeconds: activity.countdown_seconds,
    promoLabel: "限时秒杀",
    tone: CAMPAIGN_TONE.flash_sale,
    products: (activity.items ?? []).map((item) => ({
      ...item,
      href: `/product/${item.product_id}`,
    })),
    coupons: [],
    source: "home-marketing",
  };
}

function normalizeCouponCenter(value: unknown): StorefrontCampaignVm | null {
  const payload = value as Partial<CouponCenterPayload> | null;
  if (!payload?.activity) return null;
  const campaign = normalizeSummaryCampaign(payload.activity, "coupon", payload.coupons);
  return campaign ? { ...campaign, href: campaign.href || "/coupons" } : null;
}

function normalizeCouponZone(value: unknown): StorefrontCampaignVm[] {
  const payload = value as Partial<CouponZonePayload> | null;
  const campaigns = asArray(payload?.campaigns)
    .map((item) => normalizeSummaryCampaign(item, item.campaign_type === "new_user_gift" ? "new_user_gift" : "coupon", item.coupons))
    .filter((item): item is StorefrontCampaignVm => Boolean(item));

  if (campaigns.length > 0) return campaigns;
  if (!payload?.activity && !payload?.coupons?.length) return [];

  return [
    {
      id: payload.activity?.id || "coupon-zone",
      type: "coupon",
      title: payload.activity?.title || "领券优惠",
      subtitle: payload.activity?.subtitle,
      coverImage: payload.activity?.cover_image,
      promoLabel: payload.activity?.promo_label || "先领券再下单",
      href: "/coupons",
      startsAt: payload.activity?.start_at,
      endsAt: payload.activity?.end_at,
      tone: CAMPAIGN_TONE.coupon,
      products: [],
      coupons: normalizeCoupons(payload.coupons),
      source: "home-marketing",
    },
  ];
}

function normalizeNewUserGift(value: unknown): StorefrontCampaignVm | null {
  const payload = value as Partial<NewUserGiftPayload> | null;
  if (!payload?.activity) return null;
  return normalizeSummaryCampaign(payload.activity, "new_user_gift", payload.coupons);
}

function normalizeSummaryCampaign(
  value: unknown,
  type: StorefrontCampaignType,
  coupons: MarketingCouponPublic[] = [],
): StorefrontCampaignVm | null {
  const activity = value as ActivityLike | null;
  if (!activity || !activity.id || !activity.title) return null;
  const parsedFullReduction = type === "full_reduction"
    ? parseFullReductionText(`${activity.promo_label || ""} ${activity.subtitle || ""} ${activity.title || ""}`)
    : {};

  return {
    id: activity.id,
    type,
    title: activity.title,
    subtitle: activity.subtitle,
    description: activity.subtitle,
    promoLabel: activity.promo_label,
    coverImage: activity.cover_image,
    href: activity.link_url || defaultCampaignHref(type),
    startsAt: activity.start_at,
    endsAt: activity.end_at,
    thresholdAmount: parsedFullReduction.thresholdAmount,
    discountAmount: parsedFullReduction.discountAmount,
    tone: CAMPAIGN_TONE[type],
    products: [],
    coupons: normalizeCoupons(coupons.length ? coupons : activity.coupons),
    source: "home-marketing",
  };
}

function normalizeCoupons(coupons: MarketingCouponPublic[] | undefined): StorefrontCampaignCoupon[] {
  return (coupons ?? []).map((coupon) => ({
    id: coupon.id,
    title: coupon.title,
    type: coupon.type,
    value: coupon.value,
    min_amount: coupon.min_amount,
    end_date: coupon.end_date,
    campaign_id: coupon.campaign_id,
    campaign_type: coupon.campaign_type,
  }));
}

function defaultCampaignHref(type: StorefrontCampaignType) {
  if (type === "coupon" || type === "new_user_gift") return "/coupons";
  if (type === "flash_sale") return "/categories?activity=flash_sale";
  return "/categories";
}

function asArray<T>(value: T[] | unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function dedupeCampaigns(campaigns: StorefrontCampaignVm[]) {
  const seen = new Set<string>();
  return campaigns.filter((campaign) => {
    const key = `${campaign.type}:${campaign.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
