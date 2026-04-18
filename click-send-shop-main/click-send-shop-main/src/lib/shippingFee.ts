import type { ShippingTemplate } from "@/types/shipping";

/** 无商品重量字段时，按每件 0.5kg 估算（与后端一致） */
export const DEFAULT_ITEM_WEIGHT_KG = 0.5;

export function estimateCartWeightKg(
  items: { qty: number }[],
  weightPerUnit = DEFAULT_ITEM_WEIGHT_KG,
): number {
  return items.reduce((s, i) => s + i.qty * weightPerUnit, 0);
}

/**
 * 首重含在 baseFee 内（首 1kg），超出部分按 extraPerKg 计费；满额包邮优先。
 */
export function calcShippingFee(
  template: ShippingTemplate,
  orderAmount: number,
  options?: { totalWeightKg?: number },
): number {
  if (template.freeAbove > 0 && orderAmount >= template.freeAbove) return 0;
  const w = options?.totalWeightKg;
  if (w == null || w <= 0 || !Number.isFinite(w)) {
    return template.baseFee;
  }
  const extraKg = Math.max(0, w - 1);
  return template.baseFee + extraKg * template.extraPerKg;
}
