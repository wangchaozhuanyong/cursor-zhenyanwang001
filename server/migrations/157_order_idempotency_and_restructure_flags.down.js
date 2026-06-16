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

async function dropMarketingColumnIfExists(query, columnName) {
  if (!(await hasTable(query, 'marketing_activities'))) return;
  if (!(await hasColumn(query, 'marketing_activities', columnName))) return;
  await query(`ALTER TABLE marketing_activities DROP COLUMN ${columnName}`);
}

module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS order_idempotency_keys');

    await dropMarketingColumnIfExists(query, 'version');
    await dropMarketingColumnIfExists(query, 'usage_limit_per_user');
    await dropMarketingColumnIfExists(query, 'usage_limit_total');
    await dropMarketingColumnIfExists(query, 'exclusive_with');
    await dropMarketingColumnIfExists(query, 'stackable');
    await dropMarketingColumnIfExists(query, 'rule_config');
    await dropMarketingColumnIfExists(query, 'priority');
    await dropMarketingColumnIfExists(query, 'slug');
  },
};
