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
    <>
      <div className="px-1">
        <p className="mb-2 text-sm font-semibold text-foreground">4. 配送方式</p>
      </div>
      <ShippingPicker
        totalAmount={rawTotal}
        selectedId={shippingId}
        hideHeading
        onSelect={(t) => { onSelectShipping(t.id); }}
      />
      {(shippingRulesLoading || shippingQuoteLoading) && (
        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-xs text-muted-foreground">
          正在同步服务端运费规则...
        </div>
      )}
      {(shippingRulesError || shippingQuoteError) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
          运费规则获取失败：{shippingQuoteError || shippingRulesError}
        </div>
      )}
    </>
  );
}
