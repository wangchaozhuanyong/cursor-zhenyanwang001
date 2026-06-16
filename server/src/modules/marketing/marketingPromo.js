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

function normalizeDiscountPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n > 0 && n <= 1) return n * 100;
  return n;
}

function formatDiscountFold(percent) {
  const fold = Number(percent || 0) / 10;
  return fold.toFixed(2).replace(/\.?0+$/, '');
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

function formatFullDiscountLabel(activity) {
  const cfg = parseActivityConfig(activity.activity_config);
  const rules = Array.isArray(cfg?.full_discount_rules) ? cfg.full_discount_rules : [];
  if (rules.length) {
    const best = rules
      .map((r) => ({
        th: Number(r.threshold_amount || r.threshold || 0),
        percent: normalizeDiscountPercent(r.discount_percent ?? r.discount_rate ?? r.rate ?? 0),
      }))
      .filter((r) => r.th > 0 && r.percent > 0 && r.percent < 100)
      .sort((a, b) => a.th - b.th);
    if (best.length) {
      return best.map((r) => `满${r.th}打${formatDiscountFold(r.percent)}折`).join(' / ');
    }
  }
  return activity.subtitle || activity.title || '满折活动';
}

function formatMemberPriceLabel(activity) {
  const cfg = parseActivityConfig(activity.activity_config);
  const rules = Array.isArray(cfg?.member_price_rules) ? cfg.member_price_rules : [];
  if (rules.length) {
    const labels = rules
      .map((r) => normalizeDiscountPercent(r.discount_percent ?? r.discount_rate ?? r.rate ?? 0))
      .filter((percent) => percent > 0 && percent < 100)
      .sort((a, b) => a - b)
      .map((percent) => `${formatDiscountFold(percent)}折会员价`);
    if (labels.length) return [...new Set(labels)].join(' / ');
  }
  return activity.subtitle || activity.title || '会员专享';
}

function formatCheckinRewardLabel(activity) {
  const cfg = parseActivityConfig(activity.activity_config) || {};
  const points = Number(cfg.reward_points ?? cfg.points ?? cfg.daily_points ?? cfg.sign_in_points ?? 0);
  if (points > 0) return `每日签到 +${Math.trunc(points)} 积分`;
  return activity.subtitle || activity.title || '签到奖励';
}

function mapActivitySummary(row) {
  const slug = row.slug || row.id;
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    subtitle: row.subtitle || '',
    cover_image: row.cover_image || '',
    promo_label: row.type === 'full_reduction'
      ? formatFullReductionLabel(row)
      : row.type === 'full_discount'
        ? formatFullDiscountLabel(row)
        : row.type === 'member_price' || row.type === 'member_activity'
          ? formatMemberPriceLabel(row)
          : row.type === 'checkin_reward'
            ? formatCheckinRewardLabel(row)
            : (row.subtitle || row.title),
    start_at: row.start_at,
    end_at: row.end_at,
    link_url: row.type === 'coupon' || row.type === 'coupon_activity' ? '/coupons' : row.type === 'new_user_gift' ? '/coupons' : `/promotions/${slug}`,
  };
}

function mapCouponCampaignSummary(row) {
  return {
    id: row.id,
    type: row.campaign_type || row.type || 'public_claim',
    title: row.title,
    subtitle: row.subtitle || '',
    cover_image: row.cover_image || '',
    display_category: row.display_category || '',
    promo_label: row.subtitle || row.title,
    start_at: row.start_at,
    end_at: row.end_at,
    link_url: '/coupons',
  };
}

module.exports = {
  parseActivityConfig,
  formatFullReductionLabel,
  formatFullDiscountLabel,
  formatMemberPriceLabel,
  formatCheckinRewardLabel,
  mapActivitySummary,
  mapCouponCampaignSummary,
};
