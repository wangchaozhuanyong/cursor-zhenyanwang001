import { useMemo } from "react";
import {
  goodsTaxableInclusivePreview,
  parseSstFromSiteInfo,
  splitInclusiveTax,
} from "@/utils/sstTax";
import type { CheckoutPickerCoupon } from "@/types/coupon";

type SiteInfoLike = Parameters<typeof parseSstFromSiteInfo>[0];

export function useCheckoutSstPreview(
  siteInfo: SiteInfoLike,
  rawTotal: number,
  discountAmount: number,
  selectedCoupon: CheckoutPickerCoupon | null,
) {
  const sstCfg = parseSstFromSiteInfo(siteInfo);
  const goodsTaxablePreview = goodsTaxableInclusivePreview(
    rawTotal,
    discountAmount,
    selectedCoupon?.discountType ?? null,
  );
  const sstPreview = useMemo(() => {
    if (!sstCfg.enabled || sstCfg.ratePercent <= 0 || goodsTaxablePreview <= 0) return null;
    const split = splitInclusiveTax(goodsTaxablePreview, sstCfg.ratePercent);
    return {
      label: sstCfg.label,
      ratePercent: sstCfg.ratePercent,
      taxable: goodsTaxablePreview,
      taxAmount: split.taxAmount,
      exclusiveAmount: split.exclusiveAmount,
    };
  }, [goodsTaxablePreview, sstCfg.enabled, sstCfg.label, sstCfg.ratePercent]);

  return { sstCfg, sstPreview };
}
