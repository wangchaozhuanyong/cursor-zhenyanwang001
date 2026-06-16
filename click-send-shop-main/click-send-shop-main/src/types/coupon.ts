export type CouponType = "fixed" | "percentage" | "shipping";
export type CouponDisplayCategory = "recommended" | "new_user" | "member" | "shipping" | "fixed" | "percentage";
export type CouponStatus = "pending" | "available" | "locked" | "used" | "expired" | "invalidated" | "cancelled";
export type CouponClaimStatus =
  | "claimable"
  | "login_required"
  | "member_required"
  | "new_user_only"
  | "old_user_only"
  | "not_in_audience"
  | "already_claimed"
  | "sold_out"
  | "not_started"
  | "ended"
  | "disabled";

export interface CouponClaimability {
  claimable?: boolean;
  claim_status?: CouponClaimStatus;
  claim_reason?: string;
  requires_login?: boolean;
  requires_member?: boolean;
  requires_new_user?: boolean;
  issue_activity_id?: string;
  campaign_id?: string;
  audience_type?: "all" | "new_user" | "old_user" | "member_level" | "user_tag" | string;
}

export interface Coupon extends CouponClaimability {
  id: string;
  code: string;
  title: string;
  type: CouponType;
  value: number;
  min_amount: number;
  start_date: string;
  end_date: string;
  campaign_start_at?: string;
  campaign_end_at?: string;
  post_end_valid_days?: number | null;
  status: CouponStatus;
  description?: string;
  scope_type?: "all" | "category";
  display_badge?: string;
  display_category?: CouponDisplayCategory | string;
  category_ids?: string[];
  category_names?: string[];
  total_quantity?: number;
  per_user_limit?: number;
  new_user_only?: boolean;
  member_only?: boolean;
  auto_issue?: boolean;
  usable_scope_type?: "all" | "category" | "product";
  usable_product_ids?: string[];
  usable_category_ids?: string[];
  stackable_with_activity?: boolean;
  publish_status?: "draft" | "scheduled" | "active" | "paused" | "ended" | "disabled" | "archived";
  claim_start_at?: string;
  claim_end_at?: string;
  use_start_at?: string;
  use_end_at?: string;
  validity_mode?: "absolute" | "after_claim" | "follow_activity";
  valid_days_after_claim?: number | null;
  claimed_count?: number;
  used_count?: number;
  remaining_quantity?: number | null;
  usage_rate?: number;
  source_campaign_id?: string;
}

export interface UserCoupon extends CouponClaimability {
  id: string;
  coupon: Coupon;
  claimed_at: string;
  used_at?: string;
  status: CouponStatus;
  valid_from?: string;
  valid_until?: string;
  issue_channel?: string;
  issue_activity_id?: string;
  campaign_id?: string;
  source_campaign_id?: string;
  display_category?: CouponDisplayCategory | string;
  audience_type?: string;
  order_id?: string;
  order_no?: string;
  discount_amount?: number;
  invalid_reason?: string;
  returned_at?: string;
  return_reason?: string;
}

export interface CouponListParams {
  status?: CouponStatus | "all";
  page?: number;
  pageSize?: number;
}

export interface CouponCenterData {
  usable_count: number;
  claimable_count: number;
  my_usable_coupons: UserCoupon[];
  claimable_coupons: UserCoupon[];
}

/** 管理端领券记录列表行 */
export interface CouponClaimRecord {
  id: string;
  status: CouponStatus | string;
  nickname?: string;
  phone?: string;
  coupon_title?: string;
  coupon_code?: string;
  claimed_at?: string;
  used_at?: string;
}

/** 按标签批量发券结果 */
export interface IssueCouponByTagResult {
  issued?: number;
  targetUsers?: number;
}

/** 新建/编辑优惠券提交体（无 id、status） */
export type CouponUpsertPayload = Omit<Coupon, "id" | "status">;

/** 结算页优惠券选择器展示（由 couponService 从 UserCoupon 映射） */
export interface CheckoutPickerCoupon {
  id: string;
  couponId?: string;
  title: string;
  discount: number;
  discountType: "fixed" | "percentage" | "shipping";
  condition: number;
  expire: string;
  /** 用于轮换配色与图标，由映射时序号决定 */
  variantIndex: number;
  usable?: boolean;
  reason?: string;
  discountAmount?: number;
  /** 券面「适用范围」文案，与我的优惠券页一致 */
  scopeText?: string;
}

export interface CheckoutCouponsResult {
  usable: Array<CheckoutPickerCoupon & { user_coupon_id?: string; discount_amount?: number }>;
  unusable: Array<CheckoutPickerCoupon & { user_coupon_id?: string; reason: string }>;
  best_coupon_id?: string | null;
  has_more?: boolean;
}
