module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS coupon_campaign_audiences');
    await query('DROP TABLE IF EXISTS coupon_campaign_items');
    await query('DROP TABLE IF EXISTS coupon_campaigns');

    await query(`
      UPDATE marketing_activities
         SET disabled = 0,
             status = CASE WHEN status = 'disabled' THEN 'scheduled' ELSE status END,
             updated_at = NOW()
       WHERE type IN ('coupon_activity', 'new_user_gift')
         AND internal_note LIKE '%已迁移到优惠券活动中心%'
    `).catch((error) => {
      if (error?.code !== 'ER_NO_SUCH_TABLE') throw error;
    });
  },
};
