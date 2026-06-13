require('./setupTestEnv').loadTestEnv();
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const analyticsModule = require('../src/modules/analytics');
const campaignService = require('../src/modules/marketing/service/campaign.service');
const marketingService = require('../src/modules/marketing/service/marketing.service');

function withPatchedMethods(target, patches, t) {
  const originals = {};
  for (const [key, value] of Object.entries(patches)) {
    originals[key] = target[key];
    target[key] = value;
  }
  t.after(() => {
    for (const [key, value] of Object.entries(originals)) {
      target[key] = value;
    }
  });
}

describe('marketing campaign service', () => {
  test('builds the home campaign contract from marketing sources', async (t) => {
    withPatchedMethods(marketingService, {
      getFlashSaleForHome: async () => ({
        data: {
          id: 'flash-1',
          title: '今日秒杀',
          subtitle: '限时',
          cover_image: '/flash.jpg',
          start_at: '2026-06-01 00:00:00',
          end_at: '2026-06-01 02:00:00',
          countdown_seconds: 120,
          items: [
            {
              product_id: 'p1',
              product_name: '商品 A',
              cover_image: '/p1.jpg',
              flash_price: 9,
              original_price: 12,
            },
          ],
        },
      }),
      getFullReductionNotices: async () => ({
        data: [
          {
            id: 'full-1',
            title: '满减专场',
            promo_label: '满100减10',
            link_url: '/categories',
          },
        ],
      }),
      getCouponZone: async () => ({
        data: {
          campaigns: [
            {
              id: 'coupon-1',
              title: '领券中心',
              campaign_type: 'public_claim',
              link_url: '/coupons',
              coupons: [
                {
                  id: 'coupon-a',
                  title: 'RM 5 优惠券',
                  type: 'fixed',
                  value: 5,
                  min_amount: 30,
                  end_date: '2026-06-30',
                },
              ],
            },
          ],
        },
      }),
      getCouponCenter: async () => ({
        data: {
          campaigns: [
            {
              id: 'coupon-1',
              title: '领券中心',
              campaign_type: 'public_claim',
              link_url: '/coupons',
              coupons: [],
            },
          ],
        },
      }),
      getNewUserGift: async () => ({ data: { campaigns: [] } }),
    }, t);

    const result = await campaignService.getHomeCampaigns({}, { userId: 'user-1' });
    const campaigns = result.data.campaigns;

    assert.equal(Array.isArray(campaigns), true);
    assert.deepEqual(campaigns.map((campaign) => campaign.type), ['flash_sale', 'full_reduction', 'coupon']);
    assert.equal(campaigns.find((campaign) => campaign.id === 'flash-1').products[0].href, '/product/p1');
    assert.equal(campaigns.find((campaign) => campaign.id === 'full-1').thresholdAmount, 100);
    assert.equal(campaigns.find((campaign) => campaign.id === 'full-1').discountAmount, 10);
    assert.equal(campaigns.filter((campaign) => campaign.id === 'coupon-1').length, 1);
  });

  test('records campaign event metadata for analytics', async (t) => {
    const calls = [];
    withPatchedMethods(analyticsModule.api, {
      trackEvent: async (payload, req) => {
        calls.push({ payload, req });
        return { data: null, message: 'ok' };
      },
    }, t);

    const req = { user: { id: 'user-1' } };
    const result = await campaignService.recordCampaignEvent('campaign-1', 'click', {
      source_path: '/?utm_source=test',
      position: 'home_primary_campaign',
      audience: 'guest',
      campaign_type: 'flash_sale',
      title: '今日秒杀',
    }, req);

    assert.equal(result.data.accepted, true);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], {
      req,
      payload: {
        source_path: '/?utm_source=test',
        position: 'home_primary_campaign',
        audience: 'guest',
        campaign_type: 'flash_sale',
        title: '今日秒杀',
        event_type: 'activity_click',
        module: 'storefront_campaign',
        activity_id: 'campaign-1',
        path: '/?utm_source=test',
        page: '/?utm_source=test',
        keyword: 'home_primary_campaign',
        utm_campaign: 'flash_sale',
        utm_content: 'home_primary_campaign',
      },
    });
  });
});
