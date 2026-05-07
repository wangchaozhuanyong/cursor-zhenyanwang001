/**
 * 支付域：渠道配置、支付单、事件、对账、手续费（一期建表 + 默认渠道种子）
 */
module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS payment_channels (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        code VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        provider VARCHAR(32) NOT NULL DEFAULT 'manual',
        country_code VARCHAR(8) NOT NULL DEFAULT 'MY',
        currency VARCHAR(8) NOT NULL DEFAULT 'MYR',
        sort_order INT NOT NULL DEFAULT 0,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        environment VARCHAR(16) NOT NULL DEFAULT 'live',
        config_json JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_payment_channels_code (code),
        KEY idx_payment_channels_country_currency (country_code, currency, enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS payment_orders (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        order_id VARCHAR(36) NOT NULL,
        order_no VARCHAR(64) NOT NULL DEFAULT '',
        channel_id VARCHAR(36) NULL,
        channel_code VARCHAR(64) NOT NULL DEFAULT '',
        provider VARCHAR(32) NOT NULL DEFAULT 'manual',
        amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        currency VARCHAR(8) NOT NULL DEFAULT 'MYR',
        status VARCHAR(24) NOT NULL DEFAULT 'pending',
        idempotency_key VARCHAR(128) NULL,
        payment_transaction_no VARCHAR(128) NOT NULL DEFAULT '',
        payment_time DATETIME NULL,
        metadata JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_payment_orders_idempotency (idempotency_key),
        KEY idx_payment_orders_user (user_id),
        KEY idx_payment_orders_order (order_id),
        KEY idx_payment_orders_status (status),
        KEY idx_payment_orders_channel (channel_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS payment_events (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        payment_order_id VARCHAR(36) NULL,
        order_id VARCHAR(36) NULL,
        provider VARCHAR(32) NOT NULL DEFAULT '',
        provider_event_id VARCHAR(191) NULL,
        event_type VARCHAR(64) NOT NULL DEFAULT '',
        verify_status VARCHAR(24) NOT NULL DEFAULT 'pending',
        processing_result VARCHAR(32) NOT NULL DEFAULT 'pending',
        payload_json JSON NULL,
        error_message VARCHAR(512) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_payment_events_provider_event (provider, provider_event_id),
        KEY idx_payment_events_payment_order (payment_order_id),
        KEY idx_payment_events_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS payment_reconciliations (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        reconcile_date DATE NOT NULL,
        provider VARCHAR(32) NOT NULL,
        channel_code VARCHAR(64) NOT NULL DEFAULT '',
        order_count INT NOT NULL DEFAULT 0,
        success_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        diff_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        status VARCHAR(24) NOT NULL DEFAULT 'draft',
        notes VARCHAR(512) NOT NULL DEFAULT '',
        created_by VARCHAR(36) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_payment_recon_date (reconcile_date, provider)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS payment_fees (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        payment_order_id VARCHAR(36) NOT NULL,
        fee_rate_percent DECIMAL(8,4) NOT NULL DEFAULT 0,
        fee_fixed DECIMAL(12,2) NOT NULL DEFAULT 0,
        fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        net_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_payment_fees_order (payment_order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
      INSERT IGNORE INTO permissions (code, name, sort_order)
      VALUES ('payment.manage', '支付管理', 102)
    `);
    for (const roleCode of ['super_admin', 'admin_manager']) {
      await query(
        `INSERT IGNORE INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
         WHERE r.code = ? AND p.code = 'payment.manage'`,
        [roleCode],
      );
    }

    const seed = [
      ['ch_stripe_checkout', 'stripe_checkout', '在线支付（Stripe）', 'stripe', 'MY', 'MYR', 10, 1, 'live', JSON.stringify({ checkoutMode: 'session' })],
      ['ch_manual_bank', 'manual_bank', '银行转账 / 线下确认', 'manual', 'MY', 'MYR', 20, 1, 'live', JSON.stringify({})],
      ['ch_reward_wallet', 'reward_wallet', '返现钱包', 'internal', 'MY', 'MYR', 30, 1, 'live', JSON.stringify({})],
    ];
    for (const row of seed) {
      await query(
        `INSERT IGNORE INTO payment_channels
         (id, code, name, provider, country_code, currency, sort_order, enabled, environment, config_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        row,
      );
    }
  },
};
