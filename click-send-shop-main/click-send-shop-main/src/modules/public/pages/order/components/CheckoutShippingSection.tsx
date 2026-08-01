interface CheckoutShippingSectionProps {
  shippingName: string;
  note: string;
  shippingRulesLoading: boolean;
  shippingQuoteLoading: boolean;
  shippingRulesError: string | null;
  shippingQuoteError: string | null;
  onNoteChange: (value: string) => void;
}

const SECTION_SHELL = "sf-next-checkout-card";

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
      <div className="sf-next-checkout-card__head">
        <h3 className="sf-next-checkout-section-title">配送与备注</h3>
      </div>
      <div className="sf-next-checkout-shipping-fields">
        <div className="sf-next-checkout-shipping-row">
          <div>
            <p>配送方式</p>
          </div>
          <span>
            {shippingName || "平台默认运费模板"}
          </span>
        </div>
        <label className="sf-next-checkout-note-field">
          <textarea
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            rows={2}
            aria-label="订单备注"
            placeholder="给商家留言，可不填"
            className="sf-next-checkout-form-control"
          />
        </label>
      </div>
      {(shippingRulesLoading || shippingQuoteLoading) && (
        <p className="sf-next-checkout-section-message">正在计算运费...</p>
      )}
      {(shippingRulesError || shippingQuoteError) && (
        <p className="sf-next-checkout-section-message sf-next-checkout-section-message--danger">
          运费获取失败：{shippingQuoteError || shippingRulesError}
        </p>
      )}
    </div>
  );
}
