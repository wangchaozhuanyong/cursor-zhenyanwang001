import type { UserCoupon } from "@/types/coupon";
import type { MarketingCouponPublic } from "@/services/marketingService";
import { formatDateTimeDotMinute } from "@/utils/formatDateTime";

function normalizeCouponType(type: string | undefined) {
  if (type === "percent") return "percentage";
  return type;
}

export function formatCouponMinSpendText(c: UserCoupon["coupon"]) {
  if (normalizeCouponType(c.type) === "shipping") {
    return c.min_amount > 0 ? `满 RM ${c.min_amount} 包邮` : "无门槛运费券";
  }
  return c.min_amount > 0 ? `满 RM ${c.min_amount} 可用` : "无门槛可用";
}

export function formatCouponExpireText(endDate: string | undefined) {
  if (!endDate) return "有效期待定";
  const date = formatDateTimeDotMinute(endDate);
  return date === "—" ? "有效期待定" : `${date} 到期`;
}

export function formatCouponLeftAmount(c: UserCoupon["coupon"]) {
  const type = normalizeCouponType(c.type);
  if (type === "shipping") {
    return c.value <= 0 ? "免运" : `RM ${c.value}`;
  }
  if (type === "percentage") {
    const v = Number(c.value);
    if (!Number.isFinite(v)) return `${c.value}%`;
    if (c.title.includes("折") && v > 0 && v < 20) {
      return `${Math.round(v * 10)}%`;
    }
    return `${v}%`;
  }
  return `RM ${c.value}`;
}

export function formatCouponScopeText(scopeType?: string, categoryNames?: string[], categoryIds?: string[]) {
  if (scopeType === "category") {
    if (Array.isArray(categoryNames) && categoryNames.length > 0) {
      return `适用范围：${categoryNames.join("、")}`;
    }
    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      return `适用范围：指定分类（${categoryIds.length}个）`;
    }
    return "适用范围：指定分类";
  }
  return "适用范围：全场商品";
}

export function marketingCouponToPremiumDisplay(c: MarketingCouponPublic) {
  const type = normalizeCouponType(c.type);
  const scopeText = formatCouponScopeText(c.scope_type, c.category_names, c.category_ids);
  if (type === "percentage") {
    return {
      title: c.title,
      amount: `${c.value}%`,
      minSpendText: c.min_amount > 0 ? `满 RM ${c.min_amount} 可用` : "无门槛可用",
      expireText: formatCouponExpireText(c.end_date),
      scopeText,
      code: c.code,
    };
  }
  if (type === "shipping" && c.value <= 0) {
    return {
      title: c.title,
      amount: "免运",
      minSpendText: c.min_amount > 0 ? `满 RM ${c.min_amount} 可用` : "无门槛可用",
      expireText: formatCouponExpireText(c.end_date),
      scopeText,
      code: c.code,
    };
  }
  return {
    title: c.title,
    amount: `RM ${c.value}`,
    minSpendText: c.min_amount > 0 ? `满 RM ${c.min_amount} 可用` : "无门槛可用",
    expireText: formatCouponExpireText(c.end_date),
    scopeText,
    code: c.code,
  };
}

export function userCouponToPremiumDisplay(uc: UserCoupon) {
  const c = uc.coupon;
  const minSpendText = formatCouponMinSpendText(c);
  const scopeText = formatCouponScopeText(c.scope_type, c.category_names, c.category_ids);

  return {
    title: c.title,
    amount: formatCouponLeftAmount(c),
    minSpendText,
    scopeText,
    expireText: formatCouponExpireText(uc.valid_until || c.end_date),
    code: c.code,
  };
}
