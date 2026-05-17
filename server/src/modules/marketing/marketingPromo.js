/** 满减活动文案与规则解析 */
function parseActivityConfig(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatFullReductionLabel(activity) {
  const cfg = parseActivityConfig(activity.activity_config);
  const rules = Array.isArray(cfg?.full_reduction_rules) ? cfg.full_reduction_rules : [];
  if (rules.length) {
    const best = rules
      .map((r) => ({
        th: Number(r.threshold_amount || 0),
        disc: Number(r.discount_amount || 0),
      }))
      .filter((r) => r.th > 0 && r.disc > 0)
      .sort((a, b) => a.th - b.th);
    if (best.length) {
      return best.map((r) => `满${r.th}减${r.disc}`).join(' / ');
    }
  }
  const th = Number(activity.threshold_amount || 0);
  const disc = Number(activity.discount_amount || 0);
  if (th > 0 && disc > 0) return `满${th}减${disc}`;
  return activity.subtitle || activity.title || '满减活动';
}

function mapActivitySummary(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    subtitle: row.subtitle || '',
    cover_image: row.cover_image || '',
    promo_label: row.type === 'full_reduction' ? formatFullReductionLabel(row) : (row.subtitle || row.title),
    start_at: row.start_at,
    end_at: row.end_at,
    link_url: row.type === 'coupon_activity' ? '/coupons' : row.type === 'new_user_gift' ? '/coupons' : '/categories',
  };
}

module.exports = {
  parseActivityConfig,
  formatFullReductionLabel,
  mapActivitySummary,
};
