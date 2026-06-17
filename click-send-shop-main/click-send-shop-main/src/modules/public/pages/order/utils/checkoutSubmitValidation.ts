export type CheckoutSubmitValidationInput = {
  name: string;
  phone: string;
  address: string;
  shippingRulesLoading: boolean;
  shippingQuoteLoading: boolean;
  hasShippingTemplate: boolean;
  shippingRulesError: string | null | undefined;
  shippingQuoteError: string | null | undefined;
};

export type CheckoutSubmitValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateCheckoutSubmit(
  input: CheckoutSubmitValidationInput,
): CheckoutSubmitValidationResult {
  if (!input.name.trim() || !input.phone.trim()) {
    return { ok: false, message: "请填写姓名和电话" };
  }
  if (!input.address.trim()) {
    return { ok: false, message: "请填写收货地址" };
  }
  if (input.shippingRulesLoading || input.shippingQuoteLoading) {
    return { ok: false, message: "运费规则加载中，请稍后重试" };
  }
  if (!input.hasShippingTemplate) {
    return { ok: false, message: "运费规则未加载完成，无法提交订单" };
  }
  if (input.shippingRulesError || input.shippingQuoteError) {
    return { ok: false, message: "运费确认失败，请稍后重试" };
  }
  return { ok: true };
}
