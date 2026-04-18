import { describe, it, expect } from "vitest";
import { calcShippingFee, estimateCartWeightKg, DEFAULT_ITEM_WEIGHT_KG } from "./shippingFee";
import type { ShippingTemplate } from "@/types/shipping";

const tpl: ShippingTemplate = {
  id: 1,
  name: "测试",
  regions: "",
  baseFee: 10,
  freeAbove: 100,
  extraPerKg: 3,
  enabled: true,
};

describe("estimateCartWeightKg", () => {
  it("按件数 × 默认单件重量", () => {
    expect(estimateCartWeightKg([{ qty: 2 }, { qty: 1 }])).toBe(1.5);
    expect(estimateCartWeightKg([], DEFAULT_ITEM_WEIGHT_KG)).toBe(0);
  });
});

describe("calcShippingFee", () => {
  it("满额包邮", () => {
    expect(calcShippingFee(tpl, 100, { totalWeightKg: 5 })).toBe(0);
  });

  it("未满额且未传重量时仅基础费", () => {
    expect(calcShippingFee(tpl, 50)).toBe(10);
  });

  it("续重：首 1kg 含在 baseFee，超出按 extraPerKg", () => {
    // 2kg → +1kg 续重
    expect(calcShippingFee(tpl, 50, { totalWeightKg: 2 })).toBe(10 + 1 * 3);
    // 1kg → 无续重
    expect(calcShippingFee(tpl, 50, { totalWeightKg: 1 })).toBe(10);
  });
});
