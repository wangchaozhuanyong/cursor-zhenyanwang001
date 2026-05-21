import type { SiteInfo } from "@/types/content";
import type { Product } from "@/types/product";
import { isRestrictedProduct } from "@/utils/restrictedProduct";

export type RegulatedNoticeViewModel = {
  minimumAge: number | null;
  regionNotice: string | null;
  complianceNotice: string | null;
};

function parsePositiveInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

/** 商品级优先，站点级兜底 */
export function buildRegulatedProductNoticeProps(
  product: Product,
  siteInfo?: Pick<SiteInfo, "minimumAge" | "complianceNotice"> | null,
): RegulatedNoticeViewModel {
  const productAge = parsePositiveInt(product.minimum_age);
  const siteAge = parsePositiveInt(siteInfo?.minimumAge);

  return {
    minimumAge: productAge ?? siteAge,
    regionNotice: (product.region_notice || "").trim() || null,
    complianceNotice:
      (product.compliance_notice || "").trim()
      || (siteInfo?.complianceNotice || "").trim()
      || null,
  };
}

export function shouldShowRegulatedNotice(
  product: Product | null | undefined,
  complianceEnabled = true,
): boolean {
  if (!complianceEnabled || !product) return false;
  return isRestrictedProduct(product);
}

export function shouldNoindexRestrictedProduct(
  product: Product | null | undefined,
  siteInfo?: Pick<SiteInfo, "restrictedProductNoindexEnabled"> | null,
): boolean {
  if (!product || !isRestrictedProduct(product)) return false;
  return siteInfo?.restrictedProductNoindexEnabled !== "0";
}

export function canIndexProductDetail(
  product: Product,
  siteInfo?: Pick<SiteInfo, "restrictedProductNoindexEnabled"> | null,
): boolean {
  const allowIndex = product.allow_index === undefined ? true : Number(product.allow_index) === 1;
  if (shouldNoindexRestrictedProduct(product, siteInfo)) return false;
  return allowIndex;
}
