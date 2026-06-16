module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE marketing_activities
      MODIFY COLUMN type ENUM(
        'campaign',
        'coupon',
        'full_reduction',
        'full_discount',
        'limited_time_discount',
        'flash_sale',
        'member_price',
        'checkin_reward',
        'points_reward',
        'coupon_activity',
        'new_user_gift',
        'member_activity',
        'points_bonus',
        'cashback_activity'
      ) NOT NULL DEFAULT 'flash_sale'
    `).catch(() => {});
  },
};
