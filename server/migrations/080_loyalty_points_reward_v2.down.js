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

module.exports.down = async function down(query) {
  if (await hasIndex(query, 'orders', 'idx_orders_points_used')) {
    await query('ALTER TABLE orders DROP INDEX idx_orders_points_used');
  }

  const orderColumns = [
    'loyalty_meta',
    'reward_cash_discount_amount',
    'reward_cash_used',
    'points_discount_amount',
    'points_used',
  ];
  for (const col of orderColumns) {
    if (await hasColumn(query, 'orders', col)) {
      await query(`ALTER TABLE orders DROP COLUMN ${col}`);
    }
  }

  for (const col of ['points_rule_snapshot', 'earned_points']) {
    if (await hasColumn(query, 'order_items', col)) {
      await query(`ALTER TABLE order_items DROP COLUMN ${col}`);
    }
  }

  for (const col of ['settlement_timing', 'fixed_points', 'points_percent', 'reward_type']) {
    if (await hasColumn(query, 'referral_rules', col)) {
      await query(`ALTER TABLE referral_rules DROP COLUMN ${col}`);
    }
  }

  await query('DROP TABLE IF EXISTS reward_usage_settings');
  await query('DROP TABLE IF EXISTS loyalty_points_product_rules');
  await query('DROP TABLE IF EXISTS loyalty_points_settings');
};

