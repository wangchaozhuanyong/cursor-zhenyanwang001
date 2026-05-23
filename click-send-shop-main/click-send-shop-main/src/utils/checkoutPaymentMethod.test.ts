import { describe, expect, it } from "vitest";
import { canStartOnlinePayment, resolveEffectivePaymentMethod } from "./checkoutPaymentMethod";

describe("resolveEffectivePaymentMethod", () => {
  it("keeps reward_wallet when online payment is disabled", () => {
    expect(resolveEffectivePaymentMethod("reward_wallet", false)).toBe("reward_wallet");
  });

  it("keeps whatsapp when online payment is disabled", () => {
    expect(resolveEffectivePaymentMethod("whatsapp", false)).toBe("whatsapp");
  });

  it("downgrades online to whatsapp when online payment is disabled", () => {
    expect(resolveEffectivePaymentMethod("online", false)).toBe("whatsapp");
  });

  it("keeps online when online payment is enabled", () => {
    expect(resolveEffectivePaymentMethod("online", true)).toBe("online");
  });
});

describe("canStartOnlinePayment", () => {
  it("allows online-like methods only when enabled", () => {
    expect(canStartOnlinePayment("online", true)).toBe(true);
    expect(canStartOnlinePayment("points_plus_cash", true)).toBe(true);
    expect(canStartOnlinePayment("online", false)).toBe(false);
    expect(canStartOnlinePayment("reward_wallet", true)).toBe(false);
  });
});
