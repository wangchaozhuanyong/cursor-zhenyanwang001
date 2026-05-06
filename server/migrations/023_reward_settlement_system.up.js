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
  name: '023_reward_settlement_system',
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS reward_records (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        order_id VARCHAR(36) DEFAULT NULL,
        order_no VARCHAR(50) DEFAULT '',
        amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        rate DECIMAL(10,4) DEFAULT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_rr_uid (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const columns = [
      ['level', "ALTER TABLE reward_records ADD COLUMN level INT NULL AFTER rate"],
      ['order_amount', "ALTER TABLE reward_records ADD COLUMN order_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER order_no"],
      ['source_type', "ALTER TABLE reward_records ADD COLUMN source_type VARCHAR(32) NOT NULL DEFAULT 'order_completion' AFTER status"],
      ['related_record_id', "ALTER TABLE reward_records ADD COLUMN related_record_id VARCHAR(36) NULL AFTER source_type"],
      ['remark', "ALTER TABLE reward_records ADD COLUMN remark VARCHAR(500) DEFAULT '' AFTER related_record_id"],
      ['metadata', 'ALTER TABLE reward_records ADD COLUMN metadata JSON NULL AFTER remark'],
      ['approved_at', 'ALTER TABLE reward_records ADD COLUMN approved_at DATETIME NULL AFTER created_at'],
      ['paid_at', 'ALTER TABLE reward_records ADD COLUMN paid_at DATETIME NULL AFTER approved_at'],
      ['reversed_at', 'ALTER TABLE reward_records ADD COLUMN reversed_at DATETIME NULL AFTER paid_at'],
    ];

    for (const [column, sql] of columns) {
      if (!(await hasColumn(query, 'reward_records', column))) {
        await query(sql);
      }
    }

    await query("UPDATE reward_records SET level = 1 WHERE level IS NULL AND amount > 0 AND COALESCE(order_id, '') <> ''");
    await query("UPDATE reward_records SET source_type = 'order_completion' WHERE COALESCE(source_type, '') = ''");

    if (!(await hasIndex(query, 'reward_records', 'idx_reward_order'))) {
      await query('ALTER TABLE reward_records ADD INDEX idx_reward_order (order_id)');
    }
    if (!(await hasIndex(query, 'reward_records', 'idx_reward_status'))) {
      await query('ALTER TABLE reward_records ADD INDEX idx_reward_status (status)');
    }
    if (!(await hasIndex(query, 'reward_records', 'uk_reward_settle_once'))) {
      try {
        await query('ALTER TABLE reward_records ADD UNIQUE KEY uk_reward_settle_once (order_id, user_id, level, source_type)');
      } catch {
        // 历史数据可能已经重复；服务层仍会用行锁查询保证新结算不重复。
      }
    }

    await query(`
      CREATE TABLE IF NOT EXISTS reward_transactions (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        reward_record_id VARCHAR(36) DEFAULT NULL,
        user_id VARCHAR(36) NOT NULL,
        order_id VARCHAR(36) DEFAULT NULL,
        order_no VARCHAR(50) DEFAULT '',
        type VARCHAR(32) NOT NULL,
        amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'success',
        reason VARCHAR(200) DEFAULT '',
        operator_id VARCHAR(36) DEFAULT NULL,
        metadata JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_reward_tx_user (user_id),
        INDEX idx_reward_tx_order (order_id),
        INDEX idx_reward_tx_record (reward_record_id),
        INDEX idx_reward_tx_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      INSERT INTO reward_transactions
        (id, reward_record_id, user_id, order_id, order_no, type, amount, status, reason, created_at)
      SELECT UUID(), rr.id, rr.user_id, rr.order_id, rr.order_no, 'settle', rr.amount, 'success', '历史返现记录迁移', rr.created_at
      FROM reward_records rr
      WHERE rr.amount > 0
        AND rr.status IN ('approved', 'paid')
        AND NOT EXISTS (
          SELECT 1 FROM reward_transactions rt
          WHERE rt.reward_record_id = rr.id AND rt.type = 'settle'
        )
    `);
  },
};
