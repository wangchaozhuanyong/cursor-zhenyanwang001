import type { SiteInfo } from "@/types/content";

export function parseSstEnabled(v: string | undefined): boolean {
  if (v == null || v === "") return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

export function parseSstRatePercent(v: string | undefined): number {
  const n = parseFloat(String(v ?? "0"));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 100);
}

export function parseSstFromSiteInfo(site: SiteInfo) {
  return {
    enabled: parseSstEnabled(site.sstEnabled),
    ratePercent: parseSstRatePercent(site.sstRatePercent),
    label: (site.sstLabel || "SST").trim() || "SST",
    customerNote: (site.sstCustomerNote || "").trim(),
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 鍚◣閲戦鍙嶇畻绋庨锛堜笌鍚庣 sstTax.splitInclusiveTax 涓€鑷达級 */
export function splitInclusiveTax(taxableInclusive: number, ratePercent: number) {
  const gross = Math.max(0, taxableInclusive);
  const rate = Math.max(0, ratePercent);
  if (gross <= 0 || rate <= 0) {
    return { taxAmount: 0, exclusiveAmount: gross };
  }
  const taxAmount = round2((gross * rate) / (100 + rate));
  const exclusiveAmount = round2(gross - taxAmount);
  return { taxAmount, exclusiveAmount };
}

/** 缁撶畻棰勮锛氳繍璐瑰埜涓嶈鍏ュ簲绋庡晢鍝佸惈绋庡熀鏁?*/
export function goodsTaxableInclusivePreview(
  rawTotal: number,
  discountAmount: number,
  couponDiscountType: "percentage" | "fixed" | "shipping" | null | undefined,
): number {
  const nonShipping = couponDiscountType === "shipping" ? 0 : discountAmount;
  return Math.max(0, rawTotal - nonShipping);
}

