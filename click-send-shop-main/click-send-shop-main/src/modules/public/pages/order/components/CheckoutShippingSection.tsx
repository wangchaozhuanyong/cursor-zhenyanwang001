import ShippingPicker from "@/components/ShippingPicker";

interface CheckoutShippingSectionProps {
  rawTotal: number;
  shippingId: number | null;
  shippingRulesLoading: boolean;
  shippingQuoteLoading: boolean;
  shippingRulesError: string | null;
  shippingQuoteError: string | null;
  onSelectShipping: (id: number) => void;
}

const SECTION_SHELL =
  "theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow";

export function CheckoutShippingSection({
  rawTotal,
  shippingId,
  shippingRulesLoading,
  shippingQuoteLoading,
  shippingRulesError,
  shippingQuoteError,
  onSelectShipping,
}: CheckoutShippingSectionProps) {
  return (
    <div className={SECTION_SHELL}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">4. 配送方式</h3>
      <ShippingPicker
        embedded
        totalAmount={rawTotal}
        selectedId={shippingId}
        hideHeading
        onSelect={(t) => { onSelectShipping(t.id); }}
      />
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
