interface CheckoutShippingSectionProps {
  shippingName: string;
  note: string;
  shippingRulesLoading: boolean;
  shippingQuoteLoading: boolean;
  shippingRulesError: string | null;
  shippingQuoteError: string | null;
  onNoteChange: (value: string) => void;
}

const SECTION_SHELL =
  "sf-next-checkout-card rounded-[20px] border border-[color-mix(in_srgb,var(--theme-border)_70%,transparent)] bg-[var(--theme-surface)] p-4 shadow-[0_14px_38px_rgba(65,45,28,0.08)] md:p-5";

export function CheckoutShippingSection({
  shippingName,
  note,
  shippingRulesLoading,
  shippingQuoteLoading,
  shippingRulesError,
  shippingQuoteError,
  onNoteChange,
}: CheckoutShippingSectionProps) {
  return (
    <div className={SECTION_SHELL}>
      <div className="mb-3">
        <h3 className="text-[15px] font-bold text-foreground md:text-base">配送与备注</h3>
      </div>
      <div className="divide-y divide-[var(--theme-border)] rounded-2xl bg-[var(--theme-bg)] px-4">
        <div className="flex items-center justify-between gap-3 py-3.5">
          <div>
            <p className="text-sm font-semibold text-foreground">配送方式</p>
            <p className="mt-1 text-xs text-muted-foreground">结算时自动计算运费</p>
          </div>
          <span className="shrink-0 text-right text-sm font-medium text-foreground">
            {shippingName || "平台默认运费模板"}
          </span>
        </div>
        <label className="block py-3.5">
          <span className="text-sm font-semibold text-foreground">订单备注</span>
          <textarea
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            rows={2}
            placeholder="给商家留言，可不填"
            className="mt-2 w-full resize-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[var(--theme-primary)]"
          />
        </label>
      </div>
      {(shippingRulesLoading || shippingQuoteLoading) && (
        <p className="mt-3 text-xs text-muted-foreground">正在计算运费...</p>
      )}
      {(shippingRulesError || shippingQuoteError) && (
        <p className="mt-3 text-xs text-[var(--theme-danger)]">
          运费获取失败：{shippingQuoteError || shippingRulesError}
        </p>
      )}
    </div>
  );
}
