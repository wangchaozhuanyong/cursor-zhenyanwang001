import type { SiteInfo } from "@/types/content";
import type { Product } from "@/types/product";
import { isRestrictedProduct } from "@/utils/restrictedProduct";

export const AGE_GATE_STORAGE_KEY = "click_send_age_gate_v1";

export type AgeGateConfirmation = {
  minimumAge: number;
  confirmedAt: number;
};

export function isAgeGateEnabled(siteInfo?: Pick<SiteInfo, "ageGateEnabled"> | null): boolean {
  return siteInfo?.ageGateEnabled === "1";
}

export function getSiteMinimumAge(siteInfo?: Pick<SiteInfo, "minimumAge"> | null): number {
  const n = Number(siteInfo?.minimumAge);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 18;
}

/** 受限商品取站点与商品最低年龄的较大值 */
export function getRestrictedProductMinimumAge(
  product: Product,
  siteInfo?: Pick<SiteInfo, "minimumAge"> | null,
): number {
  const siteAge = getSiteMinimumAge(siteInfo);
  const productAge = Number(product.minimum_age);
  const parsed = Number.isFinite(productAge) && productAge > 0 ? Math.floor(productAge) : null;
  if (isRestrictedProduct(product) && parsed) return Math.max(siteAge, parsed);
  return siteAge;
}

export function readAgeGateConfirmation(): AgeGateConfirmation | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AGE_GATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AgeGateConfirmation;
    if (!parsed || typeof parsed.minimumAge !== "number" || parsed.minimumAge < 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeAgeGateConfirmation(minimumAge: number): void {
  if (typeof sessionStorage === "undefined") return;
  const payload: AgeGateConfirmation = {
    minimumAge: Math.max(1, Math.floor(minimumAge)),
    confirmedAt: Date.now(),
  };
  sessionStorage.setItem(AGE_GATE_STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("age-gate:confirmed", { detail: payload }));
}

export function clearAgeGateConfirmation(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(AGE_GATE_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("age-gate:cleared"));
}

export function isAgeConfirmedFor(requiredMinimumAge: number): boolean {
  const stored = readAgeGateConfirmation();
  if (!stored) return false;
  return stored.minimumAge >= Math.max(1, Math.floor(requiredMinimumAge));
}

export function requiresRestrictedPurchaseConfirmation(
  product: Product,
  siteInfo?: Pick<SiteInfo, "ageGateEnabled" | "minimumAge"> | null,
): boolean {
  if (!isRestrictedProduct(product) || !isAgeGateEnabled(siteInfo)) return false;
  const required = getRestrictedProductMinimumAge(product, siteInfo);
  return !isAgeConfirmedFor(required);
}
