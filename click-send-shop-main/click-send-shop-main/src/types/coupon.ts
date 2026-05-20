export type CouponType = "fixed" | "percentage" | "shipping";
export type CouponStatus = "available" | "used" | "expired";

export interface Coupon {
  id: string;
  code: string;
  title: string;
  type: CouponType;
  value: number;
  min_amount: number;
  start_date: string;
  end_date: string;
  status: CouponStatus;
  description?: string;
  scope_type?: "all" | "category";
  display_badge?: string;
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
}

export interface UserCoupon {
  id: string;
  coupon: Coupon;
  claimed_at: string;
  used_at?: string;
  status: CouponStatus;
}

export interface CouponListParams {
  status?: CouponStatus;
  page?: number;
  pageSize?: number;
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
}
