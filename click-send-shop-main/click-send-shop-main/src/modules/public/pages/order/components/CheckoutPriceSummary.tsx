export interface CheckoutSstPreview {
  label: string;
  ratePercent: number;
  taxable: number;
  taxAmount: number;
  exclusiveAmount: number;
}

export type CheckoutDiscountLine = {
  type: string;
  label: string;
  amount: number;
};

type PointsBonusLine = {
  type: string;
  label: string;
  multiplier_percent?: number;
};

interface CheckoutPriceSummaryProps {
  rawTotal: number;
  discountAmount: number;
  discountLines?: CheckoutDiscountLine[];
  estimatedCouponDiscount?: number;
  pricingReady?: boolean;
  pointsBonusLines?: PointsBonusLine[];
  shippingFee: number;
  totalPoints: number;
  finalTotal: number;
  sstPreview: CheckoutSstPreview | null;
  sstShowInCatalog: boolean;
  sstCustomerNote: string;
}

import StorePriceAmount from "@/components/store/StorePriceAmount";

export function CheckoutPriceSummary({
  rawTotal,
  discountAmount,
  discountLines = [],
  estimatedCouponDiscount = 0,
  pricingReady = true,
  pointsBonusLines = [],
  shippingFee,
  totalPoints,
  finalTotal,
  sstPreview,
  sstShowInCatalog,
  sstCustomerNote,
}: CheckoutPriceSummaryProps) {
  const rateStr = sstPreview
    ? (Number.isInteger(sstPreview.ratePercent) ? String(sstPreview.ratePercent) : String(sstPreview.ratePercent))
    : "";
  return (
    <div className="sf-next-checkout-price-summary">
      {sstShowInCatalog && sstCustomerNote ? (
        <p className="sf-next-checkout-price-note">{sstCustomerNote}</p>
      ) : null}
      <div className="sf-next-checkout-price-row">
        <span className="sf-next-checkout-price-label">{sstShowInCatalog ? "商品总额（含税）" : "商品总额"}</span>
        <span className="sf-next-checkout-price-value">RM {rawTotal}</span>
      </div>
      {discountLines.length > 0
        ? discountLines.map((line) => (
            <div key={`${line.type}-${line.label}`} className="sf-next-checkout-price-row sf-next-checkout-price-row--discount">
              <span className="sf-next-checkout-price-label">{line.label}</span>
              <span className="sf-next-checkout-price-value">-RM {line.amount}</span>
            </div>
          ))
        : discountAmount > 0 ? (
          <div className="sf-next-checkout-price-row sf-next-checkout-price-row--discount">
            <span className="sf-next-checkout-price-label">优惠抵扣</span>
            <span className="sf-next-checkout-price-value">-RM {discountAmount}</span>
          </div>
        ) : null}
      {!pricingReady && estimatedCouponDiscount > 0 ? (
        <div className="sf-next-checkout-price-row sf-next-checkout-price-row--muted">
          <span className="sf-next-checkout-price-label">优惠金额</span>
          <span className="sf-next-checkout-price-value">-RM {estimatedCouponDiscount}</span>
        </div>
      ) : null}
      {sstPreview ? (
        <>
          <div className="sf-next-checkout-price-row">
            <span className="sf-next-checkout-price-label">应税商品金额（含税）</span>
            <span className="sf-next-checkout-price-value">RM {sstPreview.taxable}</span>
          </div>
          <div className="sf-next-checkout-price-row sf-next-checkout-price-row--muted">
            <span className="sf-next-checkout-price-label">其中商品不含税净额</span>
            <span className="sf-next-checkout-price-value">RM {sstPreview.exclusiveAmount}</span>
          </div>
          <div className="sf-next-checkout-price-row">
            <span className="sf-next-checkout-price-label">
              含 {sstPreview.label}（{rateStr}%）
            </span>
            <span className="sf-next-checkout-price-value">RM {sstPreview.taxAmount}</span>
          </div>
        </>
      ) : null}
      <div className="sf-next-checkout-price-row">
        <span className="sf-next-checkout-price-label">运费{sstShowInCatalog ? "（不计税）" : ""}</span>
        <span className={`sf-next-checkout-price-value ${shippingFee === 0 ? "sf-next-checkout-price-value--success" : ""}`}>
          {shippingFee === 0 ? "包邮" : `RM ${shippingFee}`}
        </span>
      </div>
      <div className="sf-next-checkout-price-row">
        <span className="sf-next-checkout-price-label">预计获得积分</span>
        <span className="sf-next-checkout-price-value">{totalPoints}</span>
      </div>
      {pointsBonusLines.length > 0 ? (
        <div className="sf-next-checkout-price-bonus">
          {pointsBonusLines.map((line) => (
            <p key={`${line.type}-${line.label}`}>
              已命中：{line.label}
            </p>
          ))}
        </div>
      ) : null}
      <div className="sf-next-checkout-price-total">
        <span className="sf-next-checkout-price-total-label">实付金额</span>
        <StorePriceAmount
          amount={finalTotal}
          amountClassName="text-[22px] font-extrabold leading-none sm:text-2xl"
        />
      </div>
    </div>
  );
}
