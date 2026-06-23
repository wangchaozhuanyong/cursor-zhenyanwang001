import type { ProductActiveActivity } from "@/types/product";

const INTERNAL_TEST_COPY_RE =
  /\bV\d+\b|smoke\s+tests?|generated\s+only|QA\s+forced|forced\s+error|联调|测试|demo|mock|sample|样例|副标题|互斥|规则判断/i;

export function isInternalStorefrontCopy(value?: string | null): boolean {
  const text = String(value || "").trim();
  if (!text) return false;
  return INTERNAL_TEST_COPY_RE.test(text);
}

export function storefrontDisplayText(value: string | null | undefined, fallback: string): string {
  const text = String(value || "").trim();
  if (!text || isInternalStorefrontCopy(text)) return fallback;
  return text;
}

export function storefrontOptionalDisplayText(value?: string | null): string | undefined {
  const text = String(value || "").trim();
  if (!text || isInternalStorefrontCopy(text)) return undefined;
  return text;
}

export function storefrontProductNameFallback(type?: ProductActiveActivity["type"] | null): string {
  if (type === "flash_sale") return "限时精选商品";
  if (type === "limited_time_discount") return "限时折扣商品";
  if (type === "member_price") return "会员专享商品";
  if (type === "full_reduction" || type === "full_discount") return "组合优惠商品";
  if (type === "points_reward" || type === "checkin_reward") return "福利精选商品";
  return "商城精选商品";
}

export function storefrontCategoryName(value?: string | null): string {
  return storefrontDisplayText(value, "精选分类");
}
