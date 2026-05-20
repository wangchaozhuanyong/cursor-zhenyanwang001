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

async function addColumn(query, table, column, sql) {
  if (!(await hasColumn(query, table, column))) {
    await query(sql);
  }
}

module.exports.up = async function up(query) {
  await query(`
    CREATE TABLE IF NOT EXISTS loyalty_points_settings (
      id TINYINT PRIMARY KEY DEFAULT 1,
      display_enabled TINYINT(1) NOT NULL DEFAULT 1,
      earn_enabled TINYINT(1) NOT NULL DEFAULT 1,
      earn_basis VARCHAR(32) NOT NULL DEFAULT 'amount',
      earn_mode VARCHAR(32) NOT NULL DEFAULT 'amount_plus_product_rule',
      earn_currency_unit DECIMAL(10,2) NOT NULL DEFAULT 1.00,
      earn_points_unit INT NOT NULL DEFAULT 1,
      earn_rounding VARCHAR(16) NOT NULL DEFAULT 'floor',
      redeem_enabled TINYINT(1) NOT NULL DEFAULT 0,
      point_value_myr DECIMAL(10,4) NOT NULL DEFAULT 0.0100,
      points_per_currency INT NOT NULL DEFAULT 100,
      min_redeem_points INT NOT NULL DEFAULT 10,
      redeem_step INT NOT NULL DEFAULT 1,
      max_redeem_percent DECIMAL(10,2) NOT NULL DEFAULT 30.00,
      max_redeem_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      redeem_scope VARCHAR(32) NOT NULL DEFAULT 'exclude_restricted',
      allow_with_coupon TINYINT(1) NOT NULL DEFAULT 1,
      allow_with_reward_cash TINYINT(1) NOT NULL DEFAULT 1,
      zero_pay_allowed TINYINT(1) NOT NULL DEFAULT 1,
      settle_timing VARCHAR(32) NOT NULL DEFAULT 'order_completed',
      allowed_payment_methods JSON NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const settingsColumns = [
    ['display_enabled', 'ALTER TABLE loyalty_points_settings ADD COLUMN display_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER id'],
    ['earn_basis', "ALTER TABLE loyalty_points_settings ADD COLUMN earn_basis VARCHAR(32) NOT NULL DEFAULT 'amount' AFTER earn_enabled"],
    ['earn_mode', "ALTER TABLE loyalty_points_settings ADD COLUMN earn_mode VARCHAR(32) NOT NULL DEFAULT 'amount_plus_product_rule' AFTER earn_basis"],
    ['earn_after_discount', 'ALTER TABLE loyalty_points_settings ADD COLUMN earn_after_discount TINYINT(1) NOT NULL DEFAULT 1 AFTER earn_rounding'],
    ['earn_after_points_redeem', 'ALTER TABLE loyalty_points_settings ADD COLUMN earn_after_points_redeem TINYINT(1) NOT NULL DEFAULT 0 AFTER earn_after_discount'],
    ['promotion_no_points', 'ALTER TABLE loyalty_points_settings ADD COLUMN promotion_no_points TINYINT(1) NOT NULL DEFAULT 0 AFTER earn_after_points_redeem'],
    ['marketing_activity_no_points', 'ALTER TABLE loyalty_points_settings ADD COLUMN marketing_activity_no_points TINYINT(1) NOT NULL DEFAULT 0 AFTER promotion_no_points'],
    ['coupon_no_points', 'ALTER TABLE loyalty_points_settings ADD COLUMN coupon_no_points TINYINT(1) NOT NULL DEFAULT 0 AFTER marketing_activity_no_points'],
    ['member_price_no_points', 'ALTER TABLE loyalty_points_settings ADD COLUMN member_price_no_points TINYINT(1) NOT NULL DEFAULT 0 AFTER coupon_no_points'],
    ['payment_points_mode', "ALTER TABLE loyalty_points_settings ADD COLUMN payment_points_mode VARCHAR(32) NOT NULL DEFAULT 'all' AFTER member_price_no_points"],
    ['point_value_myr', 'ALTER TABLE loyalty_points_settings ADD COLUMN point_value_myr DECIMAL(10,4) NOT NULL DEFAULT 0.0100 AFTER redeem_enabled'],
    ['redeem_step', 'ALTER TABLE loyalty_points_settings ADD COLUMN redeem_step INT NOT NULL DEFAULT 1 AFTER min_redeem_points'],
    ['settle_timing', "ALTER TABLE loyalty_points_settings ADD COLUMN settle_timing VARCHAR(32) NOT NULL DEFAULT 'order_completed' AFTER zero_pay_allowed"],
    ['expire_enabled', 'ALTER TABLE loyalty_points_settings ADD COLUMN expire_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER settle_timing'],
    ['expire_days', 'ALTER TABLE loyalty_points_settings ADD COLUMN expire_days INT NULL AFTER expire_enabled'],
    ['allow_negative_points', 'ALTER TABLE loyalty_points_settings ADD COLUMN allow_negative_points TINYINT(1) NOT NULL DEFAULT 0 AFTER expire_days'],
  ];
  for (const [column, sql] of settingsColumns) {
    await addColumn(query, 'loyalty_points_settings', column, sql);
  }

  await query(`
    INSERT IGNORE INTO loyalty_points_settings
      (id, display_enabled, earn_enabled, earn_mode, earn_currency_unit, earn_points_unit, earn_rounding,
       redeem_enabled, point_value_myr, points_per_currency, min_redeem_points, redeem_step,
       max_redeem_percent, max_redeem_amount, min_order_amount, redeem_scope,
       allow_with_coupon, allow_with_reward_cash, zero_pay_allowed, settle_timing, allowed_payment_methods)
    VALUES
      (1, 1, 1, 'amount_plus_product_rule', 1.00, 1, 'floor',
       0, 0.0100, 100, 10, 1, 30.00, 0.00, 0.00, 'exclude_restricted',
       1, 1, 1, 'order_completed', JSON_ARRAY('online','whatsapp','bank_transfer'))
  `);

  await query(`
    UPDATE loyalty_points_settings
    SET
      earn_mode = CASE
        WHEN earn_mode IS NULL OR earn_mode = '' THEN
          CASE
            WHEN earn_basis = 'amount' THEN 'amount'
            WHEN earn_basis = 'legacy_product_points' THEN 'amount'
            ELSE 'amount_plus_product_rule'
          END
        ELSE earn_mode
      END,
      point_value_myr = CASE
        WHEN point_value_myr IS NULL OR point_value_myr <= 0 THEN 1 / GREATEST(points_per_currency, 1)
        ELSE point_value_myr
      END,
      points_per_currency = CASE
        WHEN points_per_currency IS NULL OR points_per_currency <= 0 THEN 100
        ELSE points_per_currency
      END,
      redeem_scope = COALESCE(NULLIF(redeem_scope, ''), 'exclude_restricted')
    WHERE id = 1
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
      fixed_points INT NOT NULL DEFAULT 0,
      points_percent DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      multiplier_percent DECIMAL(10,2) NOT NULL DEFAULT 100.00,
      redeem_enabled TINYINT(1) NOT NULL DEFAULT 1,
      max_redeem_percent DECIMAL(10,2) NULL,
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

  const productRuleColumns = [
    ['points_percent', 'ALTER TABLE loyalty_points_product_rules ADD COLUMN points_percent DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER fixed_points'],
    ['redeem_enabled', 'ALTER TABLE loyalty_points_product_rules ADD COLUMN redeem_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER multiplier_percent'],
    ['max_redeem_percent', 'ALTER TABLE loyalty_points_product_rules ADD COLUMN max_redeem_percent DECIMAL(10,2) NULL AFTER redeem_enabled'],
  ];
  for (const [column, sql] of productRuleColumns) {
    await addColumn(query, 'loyalty_points_product_rules', column, sql);
  }

  const orderItemColumns = [
    ['earned_points', 'ALTER TABLE order_items ADD COLUMN earned_points INT NOT NULL DEFAULT 0 AFTER points'],
    ['points_rule_snapshot', 'ALTER TABLE order_items ADD COLUMN points_rule_snapshot JSON NULL AFTER earned_points'],
    ['redeemable_amount', 'ALTER TABLE order_items ADD COLUMN redeemable_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER points_rule_snapshot'],
    ['is_restricted_excluded', 'ALTER TABLE order_items ADD COLUMN is_restricted_excluded TINYINT(1) NOT NULL DEFAULT 0 AFTER redeemable_amount'],
    ['line_points_base_amount', 'ALTER TABLE order_items ADD COLUMN line_points_base_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER is_restricted_excluded'],
  ];
  for (const [column, sql] of orderItemColumns) {
    await addColumn(query, 'order_items', column, sql);
  }

  const pointsRecordColumns = [
    ['order_id', 'ALTER TABLE points_records ADD COLUMN order_id VARCHAR(36) NULL AFTER user_id'],
    ['order_no', "ALTER TABLE points_records ADD COLUMN order_no VARCHAR(50) DEFAULT '' AFTER order_id"],
    ['balance_before', 'ALTER TABLE points_records ADD COLUMN balance_before INT NULL AFTER amount'],
    ['balance_after', 'ALTER TABLE points_records ADD COLUMN balance_after INT NULL AFTER balance_before'],
    ['source_type', "ALTER TABLE points_records ADD COLUMN source_type VARCHAR(32) NOT NULL DEFAULT 'manual' AFTER description"],
    ['related_record_id', 'ALTER TABLE points_records ADD COLUMN related_record_id VARCHAR(100) NULL AFTER source_type'],
    ['status', "ALTER TABLE points_records ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'success' AFTER related_record_id"],
    ['operator_id', 'ALTER TABLE points_records ADD COLUMN operator_id VARCHAR(36) NULL AFTER status'],
    ['metadata', 'ALTER TABLE points_records ADD COLUMN metadata JSON NULL AFTER operator_id'],
  ];
  for (const [column, sql] of pointsRecordColumns) {
    await addColumn(query, 'points_records', column, sql);
  }

  if (!(await hasIndex(query, 'points_records', 'uniq_points_action_related'))) {
    await query('ALTER TABLE points_records ADD UNIQUE KEY uniq_points_action_related (action, related_record_id)');
  }

  if (!(await hasIndex(query, 'loyalty_points_product_rules', 'idx_lpr_scope'))) {
    await query('ALTER TABLE loyalty_points_product_rules ADD KEY idx_lpr_scope (scope_type, scope_id)');
  }
  if (!(await hasIndex(query, 'loyalty_points_product_rules', 'idx_lpr_enabled_window'))) {
    await query('ALTER TABLE loyalty_points_product_rules ADD KEY idx_lpr_enabled_window (enabled, start_at, end_at)');
  }
  if (!(await hasIndex(query, 'loyalty_points_product_rules', 'idx_lpr_priority'))) {
    await query('ALTER TABLE loyalty_points_product_rules ADD KEY idx_lpr_priority (priority)');
  }
};
