import { describe, expect, it } from "vitest";
import { shouldShowPaymentOption } from "./PaymentMethodPicker";

describe("shouldShowPaymentOption", () => {
  it("shows reward_wallet when customer service and online are hidden", () => {
    expect(shouldShowPaymentOption("reward_wallet", false, false)).toBe(true);
    expect(shouldShowPaymentOption("online", false, false)).toBe(false);
    expect(shouldShowPaymentOption("whatsapp", false, false)).toBe(false);
  });

  it("hides whatsapp only when customer service is off", () => {
    expect(shouldShowPaymentOption("whatsapp", true, false)).toBe(false);
    expect(shouldShowPaymentOption("online", true, false)).toBe(true);
    expect(shouldShowPaymentOption("reward_wallet", true, false)).toBe(true);
  });
});
