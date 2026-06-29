const BANNER_IDS = [
  'home-webp-v7-customer-support',
  'home-webp-v7-membership-benefits',
  'home-webp-v7-coupon-activity',
  'home-webp-v7-delivery-arrangement',
  'home-webp-v7-local-stock',
  'home-webp-v7-china-selection',
  'home-webp-v7-gift-selection',
];

module.exports = {
  async down(query) {
    await query(
      `UPDATE banners
          SET enabled = 0,
              publish_status = 'draft',
              last_modified_at = NOW(),
              version = version + 1
        WHERE id IN (${BANNER_IDS.map(() => '?').join(',')})`,
      BANNER_IDS,
    );
  },
};
