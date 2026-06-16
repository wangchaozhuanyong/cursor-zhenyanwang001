const repo = require('../repository/shipping.repository');
const { BusinessError } = require('../../../errors/BusinessError');
const {
  computeShippingFee,
  matchesShippingTemplate,
  pickBestShippingTemplate,
  normalizeShippingDestination,
  parseList,
} = require('../../../utils/shippingFee');
const { normalizeKnownMojibakeText } = require('../../../utils/textNormalize');

function formatTemplate(r) {
  return {
    id: r.id,
    name: normalizeKnownMojibakeText(r.name),
    regions: normalizeKnownMojibakeText(r.regions),
    countryCode: r.country_code || 'MY',
    regionGroup: r.region_group || 'all',
    stateCodes: parseList(r.state_codes),
    cityNames: parseList(r.city_names),
    postcodePatterns: parseList(r.postcode_patterns),
    baseFee: parseFloat(r.base_fee),
    freeAbove: parseFloat(r.free_above),
    extraPerKg: parseFloat(r.extra_per_kg),
    minWeightKg: Number(r.min_weight_kg || 0),
    maxWeightKg: r.max_weight_kg == null ? null : Number(r.max_weight_kg),
    minOrderAmount: Number(r.min_order_amount || 0),
    maxOrderAmount: r.max_order_amount == null ? null : Number(r.max_order_amount),
    enabled: !!r.enabled,
  };
}

async function getTemplates() {
  const rows = await repo.selectTemplatesOrdered();
  return rows.map(formatTemplate);
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

  const destination = normalizeShippingDestination(payload?.destination || payload?.address || payload || {});
  const templates = await repo.selectTemplatesOrdered();
  const requestedTpl = shippingTemplateId
    ? templates.find((tpl) => String(tpl.id) === shippingTemplateId)
    : null;
  const tpl = requestedTpl && matchesShippingTemplate(requestedTpl, destination, rawAmount, estimatedWeightKg)
    ? requestedTpl
    : pickBestShippingTemplate(templates, destination, rawAmount, estimatedWeightKg)
      || requestedTpl
      || await repo.selectDefaultEnabledTemplate();
  if (!tpl) throw new BusinessError(404, '运费模板不存在或已禁用');

  const shippingFee = computeShippingFee(tpl, rawAmount, estimatedWeightKg == null ? undefined : estimatedWeightKg);
  return {
    shipping_template_id: tpl.id,
    shipping_name: normalizeKnownMojibakeText(tpl.name),
    shipping_fee: shippingFee,
    destination,
  };
}
