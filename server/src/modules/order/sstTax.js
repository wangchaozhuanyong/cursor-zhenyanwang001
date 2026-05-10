/**
 * 马来西亚 SST：含税价拆分（商品金额为含税口径，运费不计税）。
 * 税额 = round2(含税应税商品金额 × 税率 / (100 + 税率))
 */

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function parseEnabled(raw) {
  if (raw == null || raw === '') return false;
  const v = String(raw).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function clampRate(raw) {
  const n = parseFloat(String(raw ?? ''));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 100);
}

/**
 * @param {import('mysql2/promise').Pool|import('mysql2/promise').PoolConnection} db
 */
async function loadSstSettingsFromDb(db) {
  const [rows] = await db.query(
    `SELECT setting_key, setting_value FROM site_settings
     WHERE setting_key IN ('sstEnabled', 'sstRatePercent', 'sstLabel')`,
  );
  const map = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
  return {
    enabled: parseEnabled(map.sstEnabled),
    ratePercent: clampRate(map.sstRatePercent),
    label: String(map.sstLabel || 'SST').trim() || 'SST',
  };
}

function splitInclusiveTax(taxableInclusive, ratePercent) {
  const gross = Math.max(0, Number(taxableInclusive) || 0);
  const rate = Math.max(0, Number(ratePercent) || 0);
  if (gross <= 0 || rate <= 0) {
    return { tax_amount: 0, exclusive_amount: gross };
  }
  const tax = round2((gross * rate) / (100 + rate));
  const exclusive = round2(gross - tax);
  return { tax_amount: tax, exclusive_amount: exclusive };
}

/**
 * @param {{ enabled: boolean; ratePercent: number; label: string }} settings
 * @param {number} goodsInclusiveTaxable 含税商品金额（已扣满减与非运费券）
 */
function buildOrderTaxSnapshot(settings, goodsInclusiveTaxable) {
  const base = Math.max(0, Number(goodsInclusiveTaxable) || 0);
  if (!settings.enabled || settings.ratePercent <= 0 || base <= 0) {
    return {
      tax_mode: null,
      tax_rate: null,
      tax_label: null,
      taxable_amount: null,
      tax_amount: null,
      tax_exclusive_amount: null,
    };
  }
  const { tax_amount, exclusive_amount } = splitInclusiveTax(base, settings.ratePercent);
  return {
    tax_mode: 'inclusive',
    tax_rate: settings.ratePercent,
    tax_label: settings.label,
    taxable_amount: base,
    tax_amount,
    tax_exclusive_amount: exclusive_amount,
  };
}

module.exports = {
  loadSstSettingsFromDb,
  splitInclusiveTax,
  buildOrderTaxSnapshot,
  round2,
};
