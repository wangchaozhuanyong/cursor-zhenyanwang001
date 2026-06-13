import type { FlashSaleHomeItem } from "@/api/modules/marketing";
import type { MarketingCouponPublic } from "@/services/marketingService";

export type StorefrontCampaignType =
  | "flash_sale"
  | "full_reduction"
  | "coupon"
  | "new_user_gift"
  | "promotion"
  | "notice";

export type StorefrontCampaignTone = "danger" | "price" | "success" | "primary" | "neutral";

export type StorefrontCampaignCoupon = Pick<
  MarketingCouponPublic,
  "id" | "title" | "type" | "value" | "min_amount" | "end_date" | "campaign_id" | "campaign_type"
>;

export type StorefrontCampaignProduct = FlashSaleHomeItem & {
  href: string;
};

export type StorefrontCampaignVm = {
  id: string;
  type: StorefrontCampaignType;
  title: string;
  subtitle?: string;
  description?: string;
  promoLabel?: string;
  coverImage?: string;
  href?: string;
  startsAt?: string;
  endsAt?: string;
  countdownSeconds?: number;
  thresholdAmount?: number;
  discountAmount?: number;
  tone: StorefrontCampaignTone;
  products: StorefrontCampaignProduct[];
  coupons: StorefrontCampaignCoupon[];
  source: "home-marketing" | "campaign-api" | "local";
};

export type CampaignProgress = {
  reached: boolean;
  missingAmount: number;
  thresholdAmount: number;
  discountAmount?: number;
};
