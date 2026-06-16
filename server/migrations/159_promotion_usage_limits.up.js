module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS promotion_usages (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        order_id VARCHAR(36) NOT NULL,
        order_no VARCHAR(64) NOT NULL DEFAULT '',
        promotion_id VARCHAR(36) NOT NULL,
        promotion_type VARCHAR(64) NOT NULL DEFAULT '',
        promotion_title VARCHAR(255) NOT NULL DEFAULT '',
        usage_count INT NOT NULL DEFAULT 1,
        discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        reward_snapshot JSON NULL,
        status ENUM('locked','confirmed','released','cancelled') NOT NULL DEFAULT 'locked',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        released_at DATETIME NULL,
        UNIQUE KEY uk_promotion_usages_order_promotion (order_id, promotion_id),
        KEY idx_promotion_usages_promotion_status (promotion_id, status),
        KEY idx_promotion_usages_user_promotion_status (user_id, promotion_id, status),
        KEY idx_promotion_usages_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
