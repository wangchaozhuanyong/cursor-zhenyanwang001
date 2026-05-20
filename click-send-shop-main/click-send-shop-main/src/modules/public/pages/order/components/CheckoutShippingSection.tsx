interface CheckoutShippingSectionProps {
  shippingName: string;
  shippingRulesLoading: boolean;
  shippingQuoteLoading: boolean;
  shippingRulesError: string | null;
  shippingQuoteError: string | null;
}

const SECTION_SHELL =
  "theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow";

export function CheckoutShippingSection({
  shippingName,
  shippingRulesLoading,
  shippingQuoteLoading,
  shippingRulesError,
  shippingQuoteError,
}: CheckoutShippingSectionProps) {
  return (
    <div className={SECTION_SHELL}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">4. 配送方式</h3>
      <div className="rounded-xl bg-secondary px-4 py-3.5">
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
