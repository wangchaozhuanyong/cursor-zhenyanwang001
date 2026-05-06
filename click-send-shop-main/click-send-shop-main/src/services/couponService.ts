import * as couponApi from "@/api/modules/coupon";
import type { UserCoupon, CouponListParams, CheckoutPickerCoupon } from "@/types/coupon";
import type { PaginatedData } from "@/types/common";

export async function fetchUserCoupons(
  params?: CouponListParams,
): Promise<PaginatedData<UserCoupon>> {
  const res = await couponApi.getUserCoupons(params);
  return res.data;
}

export async function claimCoupon(code: string): Promise<UserCoupon> {
  const res = await couponApi.claimCoupon(code);
  return res.data;
}

export async function fetchAvailableCoupons(orderAmount: number): Promise<UserCoupon[]> {
  const res = await couponApi.getAvailableCoupons(orderAmount);
  return res.data;
}

function mapUserCouponToCheckoutPicker(uc: UserCoupon, idx: number): CheckoutPickerCoupon {
  const c = uc.coupon;
  return {
    id: uc.id,
    title: c.title,
    discount: c.value,
    discountType: c.type === "percentage" ? "percent" : c.type === "shipping" ? "shipping" : "fixed",
    condition: c.min_amount,
    expire: typeof c.end_date === "string" ? c.end_date.slice(0, 10) : "",
    variantIndex: idx,
  };
}

function isCouponInValidPeriod(endDate: string, startDate: string): boolean {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const today = `${y}-${m}-${day}`;
  return startDate.slice(0, 10) <= today && today <= endDate.slice(0, 10);
}

/** 结算页：仅「我的券」中未使用且在有效期内的券（需传 user_coupons.id 下单）。门槛由选择器展示禁用原因。 */
export async function fetchCheckoutPickerCoupons(
  _orderAmount: number,
): Promise<CheckoutPickerCoupon[]> {
  const res = await fetchUserCoupons({ status: "available", pageSize: 100 });
  const rows = res.list ?? [];
  const valid = rows.filter((uc) => {
    if (uc.status !== "available") return false;
    const c = uc.coupon;
    if (!c || (c.type !== "fixed" && c.type !== "percentage" && c.type !== "shipping")) return false;
    if (!isCouponInValidPeriod(c.end_date, c.start_date)) return false;
    return true;
  });
  return valid.map(mapUserCouponToCheckoutPicker);
}
