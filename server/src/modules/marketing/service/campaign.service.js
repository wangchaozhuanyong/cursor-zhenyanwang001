const marketingService = require('./marketing.service');

function getAnalyticsApi() {
  return /** @type {any} */ (require('../../analytics')).api || {};
}

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return n.toFixed(2).replace(/\.00$/, '');
}

function parseFullReductionText(text = '') {
  const matched = String(text).replace(/\s+/g, '').match(/满([0-9]+(?:\.[0-9]+)?)减([0-9]+(?:\.[0-9]+)?)/);
  if (!matched) return {};
  return {
    thresholdAmount: Number(matched[1]),
    discountAmount: Number(matched[2]),
  };
}

function normalizeCoupon(coupon) {
  return {
    id: coupon.id,
    title: coupon.title,
    type: coupon.type,
    value: Number(coupon.value || 0),
    min_amount: Number(coupon.min_amount || 0),
    end_date: coupon.end_date,
    campaign_id: coupon.campaign_id || null,
    campaign_type: coupon.campaign_type || null,
  };
}

function campaignTone(type) {
  if (type === 'flash_sale') return 'danger';
  if (type === 'full_reduction') return 'price';
  if (type === 'coupon') return 'success';
  if (type === 'new_user_gift') return 'primary';
  if (type === 'promotion') return 'primary';
  return 'neutral';
}

function defaultHref(type) {
  if (type === 'coupon' || type === 'new_user_gift') return '/coupons';
  if (type === 'flash_sale') return '/categories?activity=flash_sale';
  return '/categories';
}

function normalizeSummaryCampaign(summary, type, coupons = []) {
  if (!summary?.id || !summary?.title) return null;
  const parsed = type === 'full_reduction'
    ? parseFullReductionText(`${summary.promo_label || ''} ${summary.subtitle || ''} ${summary.title || ''}`)
    : {};

  return {
    id: String(summary.id),
    type,
    title: summary.title,
    subtitle: summary.subtitle || '',
    description: summary.subtitle || '',
    promoLabel: summary.promo_label || '',
    coverImage: summary.cover_image || '',
    href: summary.link_url || defaultHref(type),
    startsAt: summary.start_at,
    endsAt: summary.end_at,
    thresholdAmount: parsed.thresholdAmount,
    discountAmount: parsed.discountAmount,
    tone: campaignTone(type),
    products: [],
    coupons: (coupons || []).map(normalizeCoupon),
    source: 'campaign-api',
  };
}

function normalizeFlashSale(activity) {
  if (!activity?.id || !activity?.title) return null;
  return {
    id: String(activity.id),
    type: 'flash_sale',
    title: activity.title,
    subtitle: activity.subtitle || '',
    promoLabel: '限时秒杀',
    coverImage: activity.cover_image || '',
    href: '/categories?activity=flash_sale',
    startsAt: activity.start_at,
    endsAt: activity.end_at,
    countdownSeconds: Number(activity.countdown_seconds || 0),
    tone: campaignTone('flash_sale'),
    products: (activity.items || []).map((item) => ({
      ...item,
      href: `/product/${item.product_id}`,
    })),
    coupons: [],
    source: 'campaign-api',
  };
}

function normalizeCouponPayload(payload, fallbackType = 'coupon') {
  if (!payload) return [];
  const campaigns = [];
  const payloadCampaigns = Array.isArray(payload.campaigns) ? payload.campaigns : [];

  for (const item of payloadCampaigns) {
    const type = item.campaign_type === 'new_user_gift' || item.type === 'new_user_gift'
      ? 'new_user_gift'
      : fallbackType;
    const campaign = normalizeSummaryCampaign(item, type, item.coupons || []);
    if (campaign) campaigns.push(campaign);
  }

  if (!campaigns.length && (payload.activity || payload.coupons?.length)) {
    const campaign = normalizeSummaryCampaign(
      payload.activity || {
        id: 'coupon-zone',
        title: '领券优惠',
        promo_label: '先领券再下单',
        link_url: '/coupons',
      },
      fallbackType,
      payload.coupons || [],
    );
    if (campaign) campaigns.push(campaign);
  }

  return campaigns;
}

function dedupeCampaigns(campaigns) {
  const seen = new Set();
  return campaigns.filter((campaign) => {
    const key = `${campaign.type}:${campaign.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function settleData(loader) {
  try {
    const result = await loader();
    return result?.data || null;
  } catch {
    return null;
  }
}

async function getHomeCampaigns(query = {}, context = {}) {
  const [flashSale, fullReduction, couponZone, couponCenter, newUserGift] = await Promise.all([
    settleData(() => marketingService.getFlashSaleForHome({ position: query.flash_position || 'home_flash_sale' })),
    settleData(() => marketingService.getFullReductionNotices({ position: query.full_reduction_position || 'full_reduction_notice' })),
    settleData(() => marketingService.getCouponZone({ position: query.coupon_position || 'home_coupon_zone' }, context)),
    settleData(() => marketingService.getCouponCenter({ position: query.coupon_center_position || 'home_coupon_center' }, context)),
    settleData(() => marketingService.getNewUserGift({ position: query.new_user_position || 'home_new_user_gift' }, context)),
  ]);

  const campaigns = [];
  const flashCampaign = normalizeFlashSale(flashSale);
  if (flashCampaign) campaigns.push(flashCampaign);

  for (const item of Array.isArray(fullReduction) ? fullReduction : []) {
    const parsed = parseFullReductionText(`${item.promo_label || ''} ${item.subtitle || ''} ${item.title || ''}`);
    const campaign = normalizeSummaryCampaign(item, 'full_reduction');
    if (campaign) {
      campaign.promoLabel = campaign.promoLabel || (
        parsed.thresholdAmount && parsed.discountAmount
          ? `满${money(parsed.thresholdAmount)}减${money(parsed.discountAmount)}`
          : '满减活动'
      );
      campaigns.push(campaign);
    }
  }

  campaigns.push(...normalizeCouponPayload(couponCenter, 'coupon'));
  campaigns.push(...normalizeCouponPayload(couponZone, 'coupon'));
  campaigns.push(...normalizeCouponPayload(newUserGift, 'new_user_gift'));

  return {
    data: {
      campaigns: dedupeCampaigns(campaigns),
    },
  };
}

async function getCampaignById(id, context = {}) {
  const campaignId = String(id || '').trim();
  if (!campaignId) return { data: null };
  const result = await getHomeCampaigns({}, context);
  return {
    data: result.data.campaigns.find((campaign) => campaign.id === campaignId) || null,
  };
}

async function recordCampaignEvent(id, action, body = {}, req) {
  const analyticsApi = getAnalyticsApi();
  if (typeof analyticsApi.trackEvent !== 'function') {
    return { data: { accepted: false }, message: 'analytics_unavailable' };
  }

  const eventType = action === 'impression' ? 'activity_impression' : 'activity_click';
  const position = body.position || body.campaign_position || '';
  const sourcePath = body.source_path || body.sourcePath || body.path || body.page || '';
  await analyticsApi.trackEvent({
    ...body,
    event_type: eventType,
    module: body.module || 'storefront_campaign',
    activity_id: id,
    path: body.path || sourcePath,
    page: body.page || sourcePath,
    keyword: body.keyword || position,
    utm_campaign: body.utm_campaign || body.campaign_type || body.campaignType || '',
    utm_content: body.utm_content || position,
  }, req);

  return { data: { accepted: true }, message: 'ok' };
}

module.exports = {
  getHomeCampaigns,
  getCampaignById,
  recordCampaignEvent,
  parseFullReductionText,
};
