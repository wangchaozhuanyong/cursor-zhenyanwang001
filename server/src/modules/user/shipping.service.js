const repo = require('./shipping.repository');
const { BusinessError } = require('../../errors/BusinessError');
const { computeShippingFee } = require('../../utils/shippingFee');

async function getTemplates() {
  const rows = await repo.selectTemplatesOrdered();
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    regions: r.regions,
    baseFee: parseFloat(r.base_fee),
    freeAbove: parseFloat(r.free_above),
    extraPerKg: parseFloat(r.extra_per_kg),
    enabled: !!r.enabled,
  }));
}

module.exports = {
  getTemplates,
  quoteShipping,
};

async function quoteShipping(payload) {
  const rawTpl = payload?.shipping_template_id;
  const shippingTemplateId = rawTpl === undefined || rawTpl === null
    ? ''
    : String(rawTpl).trim();
  const rawAmount = Number(payload?.raw_amount);
  const estimatedWeightKg = payload?.estimated_weight_kg == null
    ? null
    : Number(payload.estimated_weight_kg);

  if (!shippingTemplateId) {
    throw new BusinessError(400, 'shipping_template_id 无效');
  }
  if (!Number.isFinite(rawAmount) || rawAmount < 0) {
    throw new BusinessError(400, 'raw_amount 无效');
  }
  if (estimatedWeightKg != null && (!Number.isFinite(estimatedWeightKg) || estimatedWeightKg < 0)) {
    throw new BusinessError(400, 'estimated_weight_kg 无效');
  }

  const tpl = await repo.selectTemplateById(shippingTemplateId);
  if (!tpl) throw new BusinessError(404, '运费模板不存在或已停用');

  const shippingFee = computeShippingFee(tpl, rawAmount, estimatedWeightKg == null ? undefined : estimatedWeightKg);
  return {
    shipping_template_id: tpl.id,
    shipping_name: tpl.name,
    shipping_fee: shippingFee,
  };
}
