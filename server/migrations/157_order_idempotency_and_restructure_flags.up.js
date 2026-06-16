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

async function addMarketingColumnIfMissing(query, columnName, ddl) {
  if (!(await hasTable(query, 'marketing_activities'))) return;
  if (await hasColumn(query, 'marketing_activities', columnName)) return;
  await query(`ALTER TABLE marketing_activities ADD COLUMN ${ddl}`);
}

module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS order_idempotency_keys (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        idempotency_key VARCHAR(128) NOT NULL,
        payload_hash CHAR(64) NOT NULL,
        order_id VARCHAR(36) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'processing',
        error_message VARCHAR(500) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_order_idempotency_user_key (user_id, idempotency_key),
        KEY idx_order_idempotency_order (order_id),
        KEY idx_order_idempotency_status (status, updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await addMarketingColumnIfMissing(query, 'slug', 'slug VARCHAR(180) NULL AFTER id');
    await addMarketingColumnIfMissing(query, 'priority', 'priority INT NOT NULL DEFAULT 0 AFTER sort_order');
    await addMarketingColumnIfMissing(query, 'rule_config', 'rule_config JSON NULL AFTER activity_config');
    await addMarketingColumnIfMissing(query, 'stackable', 'stackable TINYINT(1) NOT NULL DEFAULT 0 AFTER rule_config');
    await addMarketingColumnIfMissing(query, 'exclusive_with', 'exclusive_with JSON NULL AFTER stackable');
    await addMarketingColumnIfMissing(query, 'usage_limit_total', 'usage_limit_total INT NULL AFTER exclusive_with');
    await addMarketingColumnIfMissing(query, 'usage_limit_per_user', 'usage_limit_per_user INT NULL AFTER usage_limit_total');
    await addMarketingColumnIfMissing(query, 'version', 'version INT NOT NULL DEFAULT 1 AFTER usage_limit_per_user');

    if (await hasTable(query, 'marketing_activities')) {
      await query(`
        UPDATE marketing_activities
           SET slug = COALESCE(
                 NULLIF(slug, ''),
                 LOWER(REPLACE(REPLACE(REPLACE(id, '_', '-'), ' ', '-'), '.', '-'))
               ),
               priority = COALESCE(priority, sort_order, 0),
               rule_config = COALESCE(rule_config, activity_config),
               stackable = CASE
                 WHEN allow_coupon_stack = 1 AND allow_points_stack = 1 THEN 1
                 ELSE stackable
               END
         WHERE deleted_at IS NULL
      `);
    }

    if (await hasTable(query, 'site_settings')) {
      await query(`
        INSERT INTO site_settings (setting_key, setting_value)
        VALUES
          ('orderPaymentTimeoutEnabled', '1'),
          ('orderPaymentTimeoutMinutes', '30')
        ON DUPLICATE KEY UPDATE setting_value = setting_value
      `);
    }
  },
};
