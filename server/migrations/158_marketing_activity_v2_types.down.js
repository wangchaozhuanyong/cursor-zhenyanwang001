module.exports = {
  async down(query) {
    await query(`
      UPDATE marketing_activities
      SET type = CASE type
        WHEN 'campaign' THEN 'cashback_activity'
        WHEN 'coupon' THEN 'coupon_activity'
        WHEN 'full_discount' THEN 'full_reduction'
        WHEN 'limited_time_discount' THEN 'flash_sale'
        WHEN 'member_price' THEN 'member_activity'
        WHEN 'checkin_reward' THEN 'points_bonus'
        WHEN 'points_reward' THEN 'points_bonus'
        ELSE type
      END
    `).catch(() => {});

    await query(`
      ALTER TABLE marketing_activities
      MODIFY COLUMN type ENUM(
        'flash_sale',
        'full_reduction',
        'coupon_activity',
        'new_user_gift',
        'member_activity',
        'points_bonus',
        'cashback_activity'
      ) NOT NULL DEFAULT 'flash_sale'
    `).catch(() => {});
  },
};
