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

/** 含税金额反算税额（与后端 sstTax.splitInclusiveTax 一致） */
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

/** 结算预览：运费券不计入应税商品含税基数 */
export function goodsTaxableInclusivePreview(
  rawTotal: number,
  discountAmount: number,
  couponDiscountType: "percent" | "fixed" | "shipping" | null | undefined,
): number {
  const nonShipping = couponDiscountType === "shipping" ? 0 : discountAmount;
  return Math.max(0, rawTotal - nonShipping);
}
