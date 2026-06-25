import CouponPicker from "@/components/CouponPicker";
import type { CheckoutPickerCoupon } from "@/types/coupon";

interface CheckoutCouponSectionProps {
  rawTotal: number;
  shippingFee: number;
  selectedCoupon: CheckoutPickerCoupon | null;
  coupons: CheckoutPickerCoupon[];
  unusableCoupons?: CheckoutPickerCoupon[];
  loading: boolean;
  onSelect: (coupon: CheckoutPickerCoupon | null) => void;
}

const SECTION_SHELL =
  "sf-next-checkout-card rounded-[20px] border border-[color-mix(in_srgb,var(--theme-border)_70%,transparent)] bg-[var(--theme-surface)] p-4 shadow-[0_14px_38px_rgba(65,45,28,0.08)] md:p-5";

export function CheckoutCouponSection({
  rawTotal,
  shippingFee,
  selectedCoupon,
  coupons,
  unusableCoupons = [],
  loading,
  onSelect,
}: CheckoutCouponSectionProps) {
  return (
    <div className={SECTION_SHELL}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-foreground md:text-base">优惠</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">优惠只在这里选择，金额明细只展示结果</p>
        </div>
        {selectedCoupon ? (
          <span className="rounded-full bg-[color-mix(in_srgb,var(--theme-price)_10%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--theme-price)]">
            已使用
          </span>
        ) : null}
      </div>
      <CouponPicker
        embedded
        totalAmount={rawTotal}
        shippingFee={shippingFee}
        selectedCouponId={selectedCoupon?.id ?? null}
        onSelect={onSelect}
        coupons={coupons}
        unusableCoupons={unusableCoupons}
        loading={loading}
      />
    </div>
  );
}
