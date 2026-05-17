module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE users
      ADD COLUMN account_status VARCHAR(32) NOT NULL DEFAULT 'normal'
      COMMENT 'normal/disabled/blacklisted/order_limited/coupon_limited/comment_limited'
      AFTER role
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    await query(`
      ALTER TABLE users
      ADD KEY idx_users_account_status (account_status)
    `).catch((e) => {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    });

    await query(`
      ALTER TABLE member_levels
      ADD COLUMN discount_rate DECIMAL(5,2) NOT NULL DEFAULT 1.00 AFTER min_orders
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    await query(`
      ALTER TABLE member_levels
      ADD COLUMN points_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.00 AFTER discount_rate
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    await query(`
      ALTER TABLE member_levels
      ADD COLUMN coupon_pack_id VARCHAR(64) NULL AFTER points_multiplier
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    await query(`
      ALTER TABLE member_levels
      ADD COLUMN free_shipping_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER coupon_pack_id
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });
  },
};
