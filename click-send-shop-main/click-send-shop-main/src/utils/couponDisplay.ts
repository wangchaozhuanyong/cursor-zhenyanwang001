import type { UserCoupon } from "@/types/coupon";

/** 最低消费金额行（中间第二行） */
export function formatCouponMinSpendText(c: UserCoupon["coupon"]) {
  if (c.type === "shipping") {
    return c.min_amount > 0 ? `满 RM ${c.min_amount} 免/减运费` : "无门槛运费券";
  }
  return c.min_amount > 0 ? `满 RM ${c.min_amount} 可用` : "无门槛可用";
}

/** 有效期行（中间第三行，含前缀） */
export function formatCouponExpireText(endDate: string | undefined) {
  const raw = typeof endDate === "string" ? endDate : "";
  const date = raw.length >= 10 ? raw.slice(0, 10) : raw;
  return date ? `有效期至：${date}` : "有效期待定";
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
