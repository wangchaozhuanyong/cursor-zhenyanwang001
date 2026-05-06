async function hasColumn(query, tableName, columnName) {
  const result = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName],
  );
  const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
  return Array.isArray(rows) && rows.length > 0;
}

async function hasIndex(query, tableName, indexName) {
  const result = await query(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [tableName, indexName],
  );
  const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  name: '024_points_account_ledger',
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS points_accounts (
        user_id VARCHAR(36) NOT NULL PRIMARY KEY,
        balance INT NOT NULL DEFAULT 0,
        total_earned INT NOT NULL DEFAULT 0,
        total_spent INT NOT NULL DEFAULT 0,
        total_reversed INT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      INSERT INTO points_accounts (user_id, balance, total_earned, total_spent, total_reversed)
      SELECT
        u.id,
        COALESCE(u.points_balance, 0),
        GREATEST(COALESCE(u.points_balance, 0), 0),
        0,
        0
      FROM users u
      ON DUPLICATE KEY UPDATE
        balance = VALUES(balance),
        total_earned = GREATEST(points_accounts.total_earned, VALUES(total_earned))
    `);

    const columns = [
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

    for (const [column, sql] of columns) {
      if (!(await hasColumn(query, 'points_records', column))) {
        await query(sql);
      }
    }

    if (!(await hasIndex(query, 'points_records', 'idx_points_order'))) {
      await query('ALTER TABLE points_records ADD INDEX idx_points_order (order_id)');
    }
    if (!(await hasIndex(query, 'points_records', 'idx_points_action'))) {
      await query('ALTER TABLE points_records ADD INDEX idx_points_action (action)');
    }
    if (!(await hasIndex(query, 'points_records', 'idx_points_related'))) {
      await query('ALTER TABLE points_records ADD UNIQUE KEY idx_points_related (related_record_id, action)');
    }

    await query(`
      CREATE TABLE IF NOT EXISTS points_usage_settings (
        id TINYINT NOT NULL PRIMARY KEY DEFAULT 1,
        enabled TINYINT(1) NOT NULL DEFAULT 0,
        points_per_currency DECIMAL(10,2) NOT NULL DEFAULT 100,
        max_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 10,
        min_points INT NOT NULL DEFAULT 100,
        description VARCHAR(500) DEFAULT '第一阶段仅落库配置，第二阶段开放下单抵扣',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      INSERT IGNORE INTO points_usage_settings
        (id, enabled, points_per_currency, max_discount_percent, min_points)
      VALUES (1, 0, 100, 10, 100)
    `);
  },
};
