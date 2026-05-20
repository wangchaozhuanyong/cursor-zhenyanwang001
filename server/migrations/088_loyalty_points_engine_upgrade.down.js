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

async function dropColumn(query, table, column) {
  if (await hasColumn(query, table, column)) {
    await query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
  }
}

module.exports.down = async function down(query) {
  if (await hasIndex(query, 'points_records', 'uniq_points_action_related')) {
    await query('ALTER TABLE points_records DROP INDEX uniq_points_action_related');
  }

  for (const column of ['line_points_base_amount', 'is_restricted_excluded', 'redeemable_amount']) {
    await dropColumn(query, 'order_items', column);
  }

  for (const column of ['max_redeem_percent', 'redeem_enabled', 'points_percent']) {
    await dropColumn(query, 'loyalty_points_product_rules', column);
  }

  for (const column of [
    'allow_negative_points',
    'expire_days',
    'expire_enabled',
    'settle_timing',
    'redeem_step',
    'point_value_myr',
    'payment_points_mode',
    'member_price_no_points',
    'coupon_no_points',
    'marketing_activity_no_points',
    'promotion_no_points',
    'earn_after_points_redeem',
    'earn_after_discount',
    'earn_mode',
  ]) {
    await dropColumn(query, 'loyalty_points_settings', column);
  }
};
