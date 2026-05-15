module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id VARCHAR(36) NULL,
        anonymous_id VARCHAR(64) NOT NULL DEFAULT '',
        session_id VARCHAR(64) NOT NULL DEFAULT '',
        event_type VARCHAR(64) NOT NULL,
        module VARCHAR(64) NOT NULL DEFAULT '',
        page VARCHAR(128) NOT NULL DEFAULT '',
        product_id VARCHAR(36) NULL,
        variant_id VARCHAR(36) NULL,
        category_id VARCHAR(36) NULL,
        activity_id VARCHAR(36) NULL,
        coupon_id VARCHAR(36) NULL,
        keyword VARCHAR(100) NOT NULL DEFAULT '',
        order_id VARCHAR(36) NULL,
        amount DECIMAL(10,2) NULL,
        quantity INT NULL,
        device VARCHAR(32) NOT NULL DEFAULT '',
        referrer VARCHAR(255) NOT NULL DEFAULT '',
        ip_hash VARCHAR(64) NOT NULL DEFAULT '',
        user_agent VARCHAR(255) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_ae_type_time (event_type, created_at),
        KEY idx_ae_product_time (product_id, created_at),
        KEY idx_ae_category_time (category_id, created_at),
        KEY idx_ae_activity_time (activity_id, created_at),
        KEY idx_ae_coupon_time (coupon_id, created_at),
        KEY idx_ae_keyword_time (keyword, created_at),
        KEY idx_ae_user_time (user_id, created_at),
        KEY idx_ae_session_time (session_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  },
};

