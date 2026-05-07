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

/** 结算页优惠券选择器展示（由 couponService 从 UserCoupon 映射） */
export interface CheckoutPickerCoupon {
  id: string;
  title: string;
  discount: number;
  discountType: "fixed" | "percent" | "shipping";
  condition: number;
  expire: string;
  /** 用于轮换配色与图标，由映射时序号决定 */
  variantIndex: number;
}
