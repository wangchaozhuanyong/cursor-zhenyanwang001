async function hasColumn(query, table, column) {
  const [rows] = await query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column],
  );
  return rows.length > 0;
}

module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS reward_usage_settings (
        id TINYINT NOT NULL PRIMARY KEY DEFAULT 1,
        balance_label VARCHAR(50) NOT NULL DEFAULT '购物可用返现',
        usage_notice VARCHAR(500) NOT NULL DEFAULT '返现金额仅可用于购物，不可提现。',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    if (!(await hasColumn(query, 'reward_usage_settings', 'balance_label'))) {
      await query(
        "ALTER TABLE reward_usage_settings ADD COLUMN balance_label VARCHAR(50) NOT NULL DEFAULT '购物可用返现' AFTER id",
      );
    }
    if (!(await hasColumn(query, 'reward_usage_settings', 'usage_notice'))) {
      await query(
        "ALTER TABLE reward_usage_settings ADD COLUMN usage_notice VARCHAR(500) NOT NULL DEFAULT '返现金额仅可用于购物，不可提现。' AFTER balance_label",
      );
    }

    await query(`
      INSERT IGNORE INTO reward_usage_settings (id, balance_label, usage_notice)
      VALUES (1, '购物可用返现', '返现金额仅可用于购物，不可提现。')
    `);
  },
};
