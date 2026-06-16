const DEFAULT_ITEM_WEIGHT_KG = 0.5;
const WEST_MALAYSIA_STATES = new Set([
  'Selangor',
  'Kuala Lumpur',
  'Johor',
  'Penang',
  'Perak',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Kelantan',
  'Terengganu',
  'Kedah',
  'Perlis',
  'Putrajaya',
]);
const EAST_MALAYSIA_STATES = new Set(['Sabah', 'Sarawak', 'Labuan']);

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeComparable(value) {
  return normalizeText(value).toLowerCase();
}

function parseList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(normalizeText).filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(normalizeText).filter(Boolean);
    } catch {
      // Fall through to comma/newline parsing.
    }
    return raw.split(/[\n,，;；]+/).map(normalizeText).filter(Boolean);
  }
  return [];
}

function parseRuleConfig(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeShippingDestination(input = {}) {
  const source = /** @type {Record<string, any>} */ (input && typeof input === 'object' ? input : {});
  return {
    country: normalizeText(source.country || source.country_code || 'MY').toUpperCase(),
    state: normalizeText(source.state || source.address_state),
    city: normalizeText(source.city || source.address_city),
    postcode: normalizeText(source.postcode || source.postal_code || source.address_postcode),
  };
}

function malaysiaRegionGroupForState(state) {
  const normalized = normalizeText(state);
  if (WEST_MALAYSIA_STATES.has(normalized)) return 'west_malaysia';
  if (EAST_MALAYSIA_STATES.has(normalized)) return 'east_malaysia';
  return '';
}

function matchList(candidate, allowed) {
  const list = parseList(allowed);
  if (!list.length) return true;
  const value = normalizeComparable(candidate);
  return list.some((item) => normalizeComparable(item) === value);
}

function matchPostcode(postcode, patterns) {
  const list = parseList(patterns);
  if (!list.length) return true;
  const value = normalizeText(postcode);
  if (!value) return false;
  return list.some((pattern) => {
    const p = normalizeText(pattern);
    if (!p) return false;
    if (p.endsWith('*')) return value.startsWith(p.slice(0, -1));
    const rangeMatch = p.match(/^(\d{4,6})\s*-\s*(\d{4,6})$/);
    if (rangeMatch) {
      const n = Number(value);
      return Number.isFinite(n) && n >= Number(rangeMatch[1]) && n <= Number(rangeMatch[2]);
    }
    return value === p;
  });
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getTemplateRule(tpl) {
  const cfg = parseRuleConfig(tpl.rule_config);
  return {
    countryCode: normalizeText(tpl.country_code || cfg.country_code || 'MY').toUpperCase(),
    regionGroup: normalizeText(tpl.region_group || cfg.region_group || 'all') || 'all',
    stateCodes: parseList(tpl.state_codes || cfg.state_codes || cfg.states),
    cityNames: parseList(tpl.city_names || cfg.city_names || cfg.cities),
    postcodePatterns: parseList(tpl.postcode_patterns || cfg.postcode_patterns || cfg.postcodes),
    minWeightKg: numberOrNull(tpl.min_weight_kg ?? cfg.min_weight_kg) ?? 0,
    maxWeightKg: numberOrNull(tpl.max_weight_kg ?? cfg.max_weight_kg),
    minOrderAmount: numberOrNull(tpl.min_order_amount ?? cfg.min_order_amount) ?? 0,
    maxOrderAmount: numberOrNull(tpl.max_order_amount ?? cfg.max_order_amount),
  };
}

function shippingTemplateSpecificity(tpl) {
  const rule = getTemplateRule(tpl);
  let score = 0;
  if (rule.regionGroup && rule.regionGroup !== 'all') score += 10;
  if (rule.stateCodes.length) score += 20;
  if (rule.cityNames.length) score += 30;
  if (rule.postcodePatterns.length) score += 40;
  if (rule.minWeightKg > 0 || rule.maxWeightKg != null) score += 5;
  if (rule.minOrderAmount > 0 || rule.maxOrderAmount != null) score += 5;
  if (tpl.is_default) score += 1;
  return score;
}

function matchesShippingTemplate(tpl, destination = {}, rawAmount = 0, estimatedWeightKg = null) {
  if (!tpl) return false;
  const rule = getTemplateRule(tpl);
  const dest = normalizeShippingDestination(destination);
  if (rule.countryCode && dest.country && rule.countryCode !== dest.country) return false;

  if (rule.regionGroup === 'west_malaysia' || rule.regionGroup === 'east_malaysia') {
    if (!dest.state || malaysiaRegionGroupForState(dest.state) !== rule.regionGroup) return false;
  }
  if (!matchList(dest.state, rule.stateCodes)) return false;
  if (!matchList(dest.city, rule.cityNames)) return false;
  if (!matchPostcode(dest.postcode, rule.postcodePatterns)) return false;

  const amount = Number(rawAmount || 0);
  if (amount < rule.minOrderAmount) return false;
  if (rule.maxOrderAmount != null && amount > rule.maxOrderAmount) return false;

  const weight = estimatedWeightKg == null ? null : Number(estimatedWeightKg);
  if (weight != null && Number.isFinite(weight)) {
    if (weight < rule.minWeightKg) return false;
    if (rule.maxWeightKg != null && weight > rule.maxWeightKg) return false;
  }
  return true;
}

function pickBestShippingTemplate(templates, destination = {}, rawAmount = 0, estimatedWeightKg = null) {
  const matches = (templates || []).filter((tpl) => matchesShippingTemplate(tpl, destination, rawAmount, estimatedWeightKg));
  if (!matches.length) return null;
  return matches.sort((a, b) => shippingTemplateSpecificity(b) - shippingTemplateSpecificity(a))[0];
}

/**
 * @param {{ free_above: number|string, base_fee: number|string, extra_per_kg: number|string }} tpl
 * @param {number} rawAmount
 * @param {number} [estimatedWeightKg] 客户端按件数估算的总重量(kg)，缺省则仅收基础运费
 */
function computeShippingFee(tpl, rawAmount, estimatedWeightKg) {
  if (!tpl) return 0;
  const freeAbove = Number(tpl.free_above);
  const baseFee = Number(tpl.base_fee);
  const extraPerKg = Number(tpl.extra_per_kg);
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

module.exports = {
  computeShippingFee,
  estimateWeightFromItems,
  normalizeShippingDestination,
  malaysiaRegionGroupForState,
  matchesShippingTemplate,
  pickBestShippingTemplate,
  parseList,
  DEFAULT_ITEM_WEIGHT_KG,
};
