import type { Coupon } from "@/types/coupon";

export type CouponCampaignType =
  | "public_claim"
  | "new_user_gift"
  | "member"
  | "user_tag"
  | "code"
  | "seasonal"
  | "compensation";

export type CouponCampaignStatus = "draft" | "scheduled" | "active" | "ended" | "disabled";

export type CouponCampaignAudienceType = "all" | "new_user" | "member_level" | "user_tag" | "old_user";

export type CouponCampaignIssueMode = "self_claim" | "auto_register" | "admin_issue" | "code_redeem";

export interface CouponCampaignItem {
  id?: string;
  campaign_id?: string;
  coupon_id: string;
  sort_order?: number;
  coupon_title?: string;
  coupon_code?: string;
  coupon_type?: Coupon["type"];
  coupon_value?: number | null;
  coupon_min_amount?: number | null;
  coupon_status?: string;
  coupon_publish_status?: string;
}

export interface CouponCampaignAudience {
  id?: string;
  campaign_id?: string;
  scope_type: CouponCampaignAudienceType;
  scope_id?: string;
}

export interface CouponCampaign {
  id: string;
  campaign_type: CouponCampaignType;
  title: string;
  subtitle?: string;
  description?: string;
  cover_image?: string;
  start_at: string;
  end_at: string;
  status: CouponCampaignStatus;
  disabled?: boolean;
  display_positions?: string[];
  audience_type?: CouponCampaignAudienceType;
  audience_config?: Record<string, unknown> | null;
  audience_ids?: string[];
  audiences?: CouponCampaignAudience[];
  issue_mode?: CouponCampaignIssueMode;
  sort_order?: number;
  internal_note?: string;
  coupon_ids?: string[];
  items?: CouponCampaignItem[];
  coupon_count?: number;
  claimed_count?: number;
  used_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CouponCampaignPayload {
  campaign_type: CouponCampaignType;
  title: string;
  subtitle?: string;
  description?: string;
  cover_image?: string;
  start_at: string;
  end_at: string;
  status?: CouponCampaignStatus;
  disabled?: boolean;
  audience_type?: CouponCampaignAudienceType;
  audience_config?: Record<string, unknown> | null;
  audience_ids?: string[];
  issue_mode?: CouponCampaignIssueMode;
  sort_order?: number;
  internal_note?: string;
  coupon_ids: string[];
}
