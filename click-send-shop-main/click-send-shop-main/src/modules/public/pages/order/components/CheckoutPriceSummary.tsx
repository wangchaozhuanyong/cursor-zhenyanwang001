export interface CheckoutSstPreview {
  label: string;
  ratePercent: number;
  taxable: number;
  taxAmount: number;
  exclusiveAmount: number;
}

interface CheckoutPriceSummaryProps {
  rawTotal: number;
  discountAmount: number;
  shippingFee: number;
  totalPoints: number;
  finalTotal: number;
  sstPreview: CheckoutSstPreview | null;
  sstShowInCatalog: boolean;
  sstCustomerNote: string;
}

export function CheckoutPriceSummary({
  rawTotal,
  discountAmount,
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
    <div>
      {sstShowInCatalog && sstCustomerNote ? (
        <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">{sstCustomerNote}</p>
      ) : null}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{sstShowInCatalog ? "商品总额（含税）" : "商品总额"}</span>
        <span className="font-medium text-foreground">RM {rawTotal}</span>
      </div>
      {discountAmount > 0 && (
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-muted-foreground">优惠券抵扣</span>
          <span className="font-medium text-destructive">-RM {discountAmount}</span>
        </div>
      )}
      {sstPreview ? (
        <>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">应税商品金额（含税）</span>
            <span className="font-medium text-foreground">RM {sstPreview.taxable}</span>
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>其中商品不含税净额</span>
            <span>RM {sstPreview.exclusiveAmount}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-muted-foreground">
              含 {sstPreview.label}（{rateStr}%）
            </span>
            <span className="font-medium text-foreground">RM {sstPreview.taxAmount}</span>
          </div>
        </>
      ) : null}
      <div className="mt-2 flex justify-between text-sm">
        <span className="text-muted-foreground">运费{sstShowInCatalog ? "（不计税）" : ""}</span>
        <span className={`font-medium ${shippingFee === 0 ? "text-emerald-600" : "text-foreground"}`}>
          {shippingFee === 0 ? "包邮" : `RM ${shippingFee}`}
        </span>
      </div>
      <div className="mt-2 flex justify-between text-sm">
        <span className="text-muted-foreground">可获积分</span>
        <span className="font-medium text-foreground">{totalPoints}</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between border-t border-[var(--theme-border)] pt-3">
        <span className="text-sm font-medium text-foreground">应付金额</span>
        <span className="text-2xl font-bold text-[var(--theme-price)]">RM {finalTotal}</span>
      </div>
    </div>
  );
}
