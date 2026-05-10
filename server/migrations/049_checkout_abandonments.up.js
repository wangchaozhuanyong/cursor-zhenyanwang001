/**
 * 结算放弃快照：仅用于站内提示/后台人工跟进，不触发邮件、短信等外呼。
 */
module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS checkout_abandonments (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        status ENUM('open', 'ordered', 'paid', 'closed') NOT NULL DEFAULT 'open',
        order_id VARCHAR(36) NULL,
        order_no VARCHAR(64) NOT NULL DEFAULT '',
        items_count INT NOT NULL DEFAULT 0,
        items_summary JSON NULL,
        raw_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        payment_method VARCHAR(32) NOT NULL DEFAULT '',
        contact_name VARCHAR(64) NOT NULL DEFAULT '',
        contact_phone_masked VARCHAR(32) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_checkout_abandonments_status_updated (status, updated_at),
        KEY idx_checkout_abandonments_user_status (user_id, status),
        KEY idx_checkout_abandonments_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
