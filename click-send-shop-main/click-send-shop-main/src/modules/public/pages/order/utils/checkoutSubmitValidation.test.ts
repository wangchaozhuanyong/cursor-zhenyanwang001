import { describe, expect, it } from "vitest";
import { validateCheckoutSubmit } from "./checkoutSubmitValidation";

const validBase = {
  name: "张三",
  phone: "60123456789",
  address: "吉隆坡",
  shippingRulesLoading: false,
  shippingQuoteLoading: false,
  hasShippingTemplate: true,
  shippingRulesError: null,
  shippingQuoteError: null,
};

describe("validateCheckoutSubmit", () => {
  it("accepts complete checkout input", () => {
    expect(validateCheckoutSubmit(validBase)).toEqual({ ok: true });
  });

  it("rejects missing contact fields", () => {
    expect(validateCheckoutSubmit({ ...validBase, name: " " }).message).toMatch(/姓名/);
    expect(validateCheckoutSubmit({ ...validBase, phone: "" }).message).toMatch(/电话/);
    expect(validateCheckoutSubmit({ ...validBase, address: "" }).message).toMatch(/地址/);
  });

  it("rejects while shipping is loading or invalid", () => {
    expect(validateCheckoutSubmit({ ...validBase, shippingQuoteLoading: true }).message).toMatch(/运费/);
    expect(validateCheckoutSubmit({ ...validBase, hasShippingTemplate: false }).message).toMatch(/运费规则/);
    expect(validateCheckoutSubmit({ ...validBase, shippingQuoteError: "fail" }).message).toMatch(/运费/);
  });
});
