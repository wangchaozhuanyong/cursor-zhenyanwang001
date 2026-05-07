module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE coupons
      ADD COLUMN scope_type VARCHAR(20) NOT NULL DEFAULT 'all' AFTER description,
      ADD COLUMN display_badge VARCHAR(64) NOT NULL DEFAULT '' AFTER scope_type
    `).catch(() => {});

    await query(`
      CREATE TABLE IF NOT EXISTS coupon_categories (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        coupon_id VARCHAR(36) NOT NULL,
        category_id VARCHAR(36) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_coupon_category (coupon_id, category_id),
        KEY idx_coupon_categories_coupon (coupon_id),
        KEY idx_coupon_categories_category (category_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  },
};
