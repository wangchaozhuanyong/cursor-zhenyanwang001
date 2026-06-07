async function hasTable(query, tableName) {
  const [rows] = await query(
    `SELECT 1
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     LIMIT 1`,
    [tableName],
  );
  return rows.length > 0;
}

async function hasColumn(query, tableName, columnName) {
  const [rows] = await query(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName],
  );
  return rows.length > 0;
}

async function hasIndex(query, tableName, indexName) {
  const [rows] = await query(
    `SELECT 1
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
     LIMIT 1`,
    [tableName, indexName],
  );
  return rows.length > 0;
}

async function dropColumnIfExists(query, columnName) {
  if (!(await hasColumn(query, 'coupons', columnName))) return;
  await query(`ALTER TABLE coupons DROP COLUMN ${columnName}`);
}

module.exports = {
  async down(query) {
    if (!(await hasTable(query, 'coupons'))) return;

    if (await hasIndex(query, 'coupons', 'idx_coupons_campaign_window')) {
      await query('DROP INDEX idx_coupons_campaign_window ON coupons');
    }
    if (await hasIndex(query, 'coupons', 'idx_coupons_source_campaign')) {
      await query('DROP INDEX idx_coupons_source_campaign ON coupons');
    }

    await dropColumnIfExists(query, 'source_coupon_id');
    await dropColumnIfExists(query, 'source_campaign_id');
    await dropColumnIfExists(query, 'audience_config');
    await dropColumnIfExists(query, 'audience_type');
    await dropColumnIfExists(query, 'display_positions');
    await dropColumnIfExists(query, 'post_end_valid_days');
    await dropColumnIfExists(query, 'campaign_end_at');
    await dropColumnIfExists(query, 'campaign_start_at');
  },
};
