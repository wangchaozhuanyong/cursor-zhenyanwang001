const DEFAULT_ITEM_WEIGHT_KG = 0.5;

/**
 * @param {{ free_above: number|string, base_fee: number|string, extra_per_kg: number|string }} tpl
 * @param {number} rawAmount
 * @param {number} [estimatedWeightKg] 客户端按件数估算的总重量(kg)，缺省则仅收基础运费
 */
function computeShippingFee(tpl, rawAmount, estimatedWeightKg) {
  if (!tpl) return 0;
  const freeAbove = parseFloat(tpl.free_above);
  const baseFee = parseFloat(tpl.base_fee);
  const extraPerKg = parseFloat(tpl.extra_per_kg);
  if (freeAbove > 0 && rawAmount >= freeAbove) return 0;
  const w = estimatedWeightKg != null && Number.isFinite(estimatedWeightKg) ? estimatedWeightKg : null;
  if (w == null || w <= 0) return baseFee;
  const extraKg = Math.max(0, w - 1);
  return baseFee + extraKg * extraPerKg;
}

function estimateWeightFromItems(items, weightPerUnit = DEFAULT_ITEM_WEIGHT_KG) {
  if (!items || !items.length) return 0;
  return items.reduce((s, it) => s + (it.qty || 0) * weightPerUnit, 0);
}

module.exports = { computeShippingFee, estimateWeightFromItems, DEFAULT_ITEM_WEIGHT_KG };
