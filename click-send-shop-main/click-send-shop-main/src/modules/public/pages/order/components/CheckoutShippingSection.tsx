interface CheckoutShippingSectionProps {
  shippingName: string;
  shippingRulesLoading: boolean;
  shippingQuoteLoading: boolean;
  shippingRulesError: string | null;
  shippingQuoteError: string | null;
}

const SECTION_SHELL =
  "store-checkout-card theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow";

export function CheckoutShippingSection({
  shippingName,
  shippingRulesLoading,
  shippingQuoteLoading,
  shippingRulesError,
  shippingQuoteError,
}: CheckoutShippingSectionProps) {
  return (
    <div className={SECTION_SHELL}>
      <div className="mb-3 flex items-center gap-3">
        <span className="store-checkout-step flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--theme-price)] text-xs font-bold text-white">5</span>
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">配送方式</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">系统会根据商品、地址和平台规则自动计算运费</p>
        </div>
      </div>
      <div className="store-choice-row rounded-2xl bg-[var(--theme-bg)] px-4 py-3.5">
        <p className="text-sm font-medium text-foreground">{shippingName || "平台默认运费模板"}</p>
        <p className="mt-1 text-xs text-muted-foreground">运费模板由平台统一配置，结算自动应用</p>
      </div>
      {(shippingRulesLoading || shippingQuoteLoading) && (
        <p className="mt-3 text-xs text-muted-foreground">正在同步服务端运费规则...</p>
      )}
      {(shippingRulesError || shippingQuoteError) && (
        <p className="mt-3 text-xs text-[var(--theme-danger)]">
          运费规则获取失败：{shippingQuoteError || shippingRulesError}
        </p>
      )}
    </div>
  );
}
