import { describe, expect, it } from "vitest";
import { splitPhoneForInput, validatePhoneForCountry } from "./authValidation";

describe("authValidation", () => {
  it("keeps Malaysia phone input without local leading zero when country code is shown", () => {
    expect(splitPhoneForInput("+60123456789")).toEqual({
      countryCode: "+60",
      phone: "123456789",
    });
  });

  it("uses a Malaysia phone example without leading zero", () => {
    expect(validatePhoneForCountry("23456789", "+60")).toBe(
      "马来西亚手机号格式不正确，请输入 9-10 位本地手机号，例如 123456789",
    );
  });
});
