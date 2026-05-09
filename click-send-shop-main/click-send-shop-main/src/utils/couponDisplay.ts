import type { UserCoupon } from "@/types/coupon";

/** 供 PremiumCouponCard 使用的展示字段（与优惠券列表页一致） */
export function userCouponToPremiumDisplay(uc: UserCoupon) {
  const c = uc.coupon;
  const amountPrefix =
    c.type === "percentage" || (c.type === "shipping" && c.value <= 0) ? "" : "RM";
  const amount =
    c.type === "percentage"
      ? `${c.value}%`
      : c.type === "shipping" && c.value <= 0
        ? "免运"
        : String(c.value);
  const conditionText =
    c.type === "shipping"
      ? c.min_amount > 0
        ? `满 RM ${c.min_amount} 免/减运费`
        : "免/减运费"
      : c.min_amount > 0
        ? `满 RM ${c.min_amount} 可用`
        : "无门槛可用";
  const scopeText =
    c.scope_type === "category" && c.category_names?.length
      ? `适用范围：${c.category_names.join("、")}`
      : "适用范围：全场商品";
  const expireRaw = typeof c.end_date === "string" ? c.end_date : "";
  const expireText = expireRaw.length >= 10 ? expireRaw.slice(0, 10) : expireRaw;
  const badge = c.display_badge || c.description || undefined;

  return {
    title: c.title,
    amountPrefix,
    amount,
    conditionText,
    scopeText,
    expireText,
    badge,
    code: c.code,
  };
}
