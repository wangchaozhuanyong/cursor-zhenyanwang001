async function hasColumn(query, table, column) {
  const [rows] = await query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column],
  );
  return rows.length > 0;
}

async function hasIndex(query, table, indexName) {
  const [rows] = await query(
    `SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
     LIMIT 1`,
    [table, indexName],
  );
  return rows.length > 0;
}

module.exports.up = async function up(query) {
  await query(`
    CREATE TABLE IF NOT EXISTS loyalty_points_settings (
      id TINYINT PRIMARY KEY DEFAULT 1,
      earn_enabled TINYINT(1) NOT NULL DEFAULT 1,
      earn_basis VARCHAR(32) NOT NULL DEFAULT 'amount',
      earn_currency_unit DECIMAL(10,2) NOT NULL DEFAULT 1.00,
      earn_points_unit INT NOT NULL DEFAULT 1,
      earn_multiplier_percent DECIMAL(10,2) NOT NULL DEFAULT 100.00,
      earn_rounding VARCHAR(16) NOT NULL DEFAULT 'floor',
      redeem_enabled TINYINT(1) NOT NULL DEFAULT 0,
      points_per_currency INT NOT NULL DEFAULT 100,
      min_redeem_points INT NOT NULL DEFAULT 0,
      max_redeem_percent DECIMAL(10,2) NOT NULL DEFAULT 100.00,
      max_redeem_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      redeem_scope VARCHAR(32) NOT NULL DEFAULT 'all',
      allow_with_coupon TINYINT(1) NOT NULL DEFAULT 1,
      allow_with_reward_cash TINYINT(1) NOT NULL DEFAULT 1,
      allowed_payment_methods JSON NULL,
      zero_pay_allowed TINYINT(1) NOT NULL DEFAULT 1,
      display_enabled TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await query(`
    INSERT IGNORE INTO loyalty_points_settings (id, allowed_payment_methods)
    VALUES (1, JSON_ARRAY('online','whatsapp'))
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS loyalty_points_product_rules (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      scope_type VARCHAR(32) NOT NULL DEFAULT 'all',
      scope_id VARCHAR(36) NULL,
      priority INT NOT NULL DEFAULT 100,
      earn_enabled TINYINT(1) NOT NULL DEFAULT 1,
      earn_mode VARCHAR(32) NOT NULL DEFAULT 'inherit',
      multiplier_percent DECIMAL(10,2) NOT NULL DEFAULT 100.00,
      fixed_points INT NOT NULL DEFAULT 0,
      start_at DATETIME NULL,
      end_at DATETIME NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_lpr_scope (scope_type, scope_id),
      KEY idx_lpr_enabled_window (enabled, start_at, end_at),
      KEY idx_lpr_priority (priority)
    )
  `);

  const orderColumns = [
    ['points_used', 'ALTER TABLE orders ADD COLUMN points_used INT NOT NULL DEFAULT 0 AFTER total_points'],
    ['points_discount_amount', 'ALTER TABLE orders ADD COLUMN points_discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER points_used'],
    ['reward_cash_used', 'ALTER TABLE orders ADD COLUMN reward_cash_used DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER points_discount_amount'],
    ['reward_cash_discount_amount', 'ALTER TABLE orders ADD COLUMN reward_cash_discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER reward_cash_used'],
    ['loyalty_meta', 'ALTER TABLE orders ADD COLUMN loyalty_meta JSON NULL AFTER reward_cash_discount_amount'],
  ];
  for (const [name, sql] of orderColumns) {
    if (!(await hasColumn(query, 'orders', name))) await query(sql);
  }

  const orderItemColumns = [
    ['earned_points', 'ALTER TABLE order_items ADD COLUMN earned_points INT NOT NULL DEFAULT 0 AFTER points'],
    ['points_rule_snapshot', 'ALTER TABLE order_items ADD COLUMN points_rule_snapshot JSON NULL AFTER earned_points'],
  ];
  for (const [name, sql] of orderItemColumns) {
    if (!(await hasColumn(query, 'order_items', name))) await query(sql);
  }

  const referralColumns = [
    ['reward_type', "ALTER TABLE referral_rules ADD COLUMN reward_type VARCHAR(16) NOT NULL DEFAULT 'cash' AFTER reward_percent"],
    ['points_percent', 'ALTER TABLE referral_rules ADD COLUMN points_percent DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER reward_type'],
    ['fixed_points', 'ALTER TABLE referral_rules ADD COLUMN fixed_points INT NOT NULL DEFAULT 0 AFTER points_percent'],
    ['settlement_timing', "ALTER TABLE referral_rules ADD COLUMN settlement_timing VARCHAR(32) NOT NULL DEFAULT 'order_completed' AFTER fixed_points"],
  ];
  for (const [name, sql] of referralColumns) {
    if (!(await hasColumn(query, 'referral_rules', name))) await query(sql);
  }

  await query(`
    CREATE TABLE IF NOT EXISTS reward_usage_settings (
      id TINYINT PRIMARY KEY DEFAULT 1,
      reward_enabled TINYINT(1) NOT NULL DEFAULT 1,
      wallet_redeem_enabled TINYINT(1) NOT NULL DEFAULT 0,
      min_redeem_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      max_redeem_percent DECIMAL(10,2) NOT NULL DEFAULT 100.00,
      max_redeem_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      redeem_scope VARCHAR(32) NOT NULL DEFAULT 'all',
      allow_with_coupon TINYINT(1) NOT NULL DEFAULT 1,
      allow_with_points TINYINT(1) NOT NULL DEFAULT 1,
      allowed_payment_methods JSON NULL,
      zero_pay_allowed TINYINT(1) NOT NULL DEFAULT 1,
      withdraw_enabled TINYINT(1) NOT NULL DEFAULT 1,
      min_withdraw_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      display_enabled TINYINT(1) NOT NULL DEFAULT 1,
      referral_enabled TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await query(`
    INSERT IGNORE INTO reward_usage_settings (id, allowed_payment_methods)
    VALUES (1, JSON_ARRAY('online','whatsapp'))
  `);

  if (!(await hasIndex(query, 'orders', 'idx_orders_points_used'))) {
    await query('ALTER TABLE orders ADD KEY idx_orders_points_used (points_used)');
  }
};

