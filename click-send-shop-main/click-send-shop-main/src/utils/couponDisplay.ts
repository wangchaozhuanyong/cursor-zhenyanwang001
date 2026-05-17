import type { UserCoupon } from "@/types/coupon";
import type { MarketingCouponPublic } from "@/services/marketingService";
import { formatDate } from "@/utils/formatDateTime";

/** 最低消费金额行（中间第二行） */
export function formatCouponMinSpendText(c: UserCoupon["coupon"]) {
  if (c.type === "shipping") {
    return c.min_amount > 0 ? `满 RM ${c.min_amount} 免/减运费` : "无门槛运费券";
  }
  return c.min_amount > 0 ? `满 RM ${c.min_amount} 可用` : "无门槛可用";
}

/** 有效期行（中间第三行，含前缀） */
export function formatCouponExpireText(endDate: string | undefined) {
  if (!endDate) return "有效期待定";
  const date = formatDate(endDate);
  return date === "—" ? "有效期待定" : `有效期至：${date}`;
}

/** 左侧大号面额/折扣（图3：单行，如 95% / RM 20） */
export function formatCouponLeftAmount(c: UserCoupon["coupon"]) {
  if (c.type === "shipping") {
    return c.value <= 0 ? "免运" : `RM ${c.value}`;
  }
  if (c.type === "percentage") {
    const v = Number(c.value);
    if (!Number.isFinite(v)) return `${c.value}%`;
    // 9.5折 → 左侧展示 95%
    if (c.title.includes("折") && v > 0 && v < 20) {
      return `${Math.round(v * 10)}%`;
    }
    return `${v}%`;
  }
  return `RM ${c.value}`;
}

/** 营销 API 公开券 → PremiumCouponCard 字段 */
export function marketingCouponToPremiumDisplay(c: MarketingCouponPublic) {
  if (c.type === "percent" || c.type === "percentage") {
    return {
      title: c.title,
      amountPrefix: "",
      amount: `${c.value}%`,
      minSpendText: c.min_amount > 0 ? `满 RM ${c.min_amount} 可用` : "无门槛",
      expireText: formatCouponExpireText(c.end_date),
      scopeText: "适用范围：全场商品",
      code: c.code,
    };
  }
  if (c.type === "shipping" && c.value <= 0) {
    return {
      title: c.title,
      amountPrefix: "",
      amount: "免运",
      minSpendText: c.min_amount > 0 ? `满 RM ${c.min_amount} 可用` : "无门槛",
      expireText: formatCouponExpireText(c.end_date),
      scopeText: "适用范围：全场商品",
      code: c.code,
    };
  }
  return {
    title: c.title,
    amountPrefix: "",
    amount: `RM ${c.value}`,
    minSpendText: c.min_amount > 0 ? `满 RM ${c.min_amount} 可用` : "无门槛",
    expireText: formatCouponExpireText(c.end_date),
    scopeText: "适用范围：全场商品",
    code: c.code,
  };
}

/** 供 PremiumCouponCard 使用的展示字段（与图3 会员礼包一致） */
export function userCouponToPremiumDisplay(uc: UserCoupon) {
  const c = uc.coupon;
  const minSpendText = formatCouponMinSpendText(c);
  const scopeText =
    c.scope_type === "category" && c.category_names?.length
      ? `适用范围：${c.category_names.join("、")}`
      : "适用范围：全场商品";

  return {
    title: c.title,
    amountPrefix: "",
    amount: formatCouponLeftAmount(c),
    minSpendText,
    scopeText,
    expireText: formatCouponExpireText(c.end_date),
    code: c.code,
  };
}
