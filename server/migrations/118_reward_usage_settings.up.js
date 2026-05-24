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

    await query(`
      INSERT IGNORE INTO reward_usage_settings (id, balance_label, usage_notice)
      VALUES (1, '购物可用返现', '返现金额仅可用于购物，不可提现。')
    `);
  },
};
