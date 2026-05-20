const repo = require('../repository/shipping.repository');
const { BusinessError } = require('../../../errors/BusinessError');
const { computeShippingFee } = require('../../../utils/shippingFee');
const { normalizeKnownMojibakeText } = require('../../../utils/textNormalize');

async function getTemplates() {
  const rows = await repo.selectTemplatesOrdered();
  return rows.map((r) => ({
    id: r.id,
    name: normalizeKnownMojibakeText(r.name),
    regions: normalizeKnownMojibakeText(r.regions),
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

  if (!Number.isFinite(rawAmount) || rawAmount < 0) {
    throw new BusinessError(400, 'raw_amount 无效');
  }
  if (estimatedWeightKg != null && (!Number.isFinite(estimatedWeightKg) || estimatedWeightKg < 0)) {
    throw new BusinessError(400, 'estimated_weight_kg 无效');
  }

  const tpl = shippingTemplateId
    ? await repo.selectTemplateById(shippingTemplateId)
    : await repo.selectDefaultEnabledTemplate();
  if (!tpl) throw new BusinessError(404, 'Shipping template not found or disabled');

  const shippingFee = computeShippingFee(tpl, rawAmount, estimatedWeightKg == null ? undefined : estimatedWeightKg);
  return {
    shipping_template_id: tpl.id,
    shipping_name: normalizeKnownMojibakeText(tpl.name),
    shipping_fee: shippingFee,
  };
}
