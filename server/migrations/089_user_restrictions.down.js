module.exports = {
  async down(query) {
    await query(`
      UPDATE users u
      LEFT JOIN user_restrictions ur ON ur.user_id = u.id
      SET u.account_status = CASE
        WHEN COALESCE(ur.order_restricted, 0) = 1 THEN 'order_limited'
        WHEN COALESCE(ur.coupon_restricted, 0) = 1 THEN 'coupon_limited'
        WHEN COALESCE(ur.comment_restricted, 0) = 1 THEN 'comment_limited'
        ELSE u.account_status
      END
      WHERE u.account_status = 'normal'
    `).catch(() => {});
    await query('DROP TABLE IF EXISTS user_restrictions').catch(() => {});
  },
};

