/**
 * 统一部分早期迁移表的 utf8mb4 校对规则（默认 0900_ai_ci）为 utf8mb4_unicode_ci，
 * 与 bootstrap / 监控 / 订单域主表一致，避免 JOIN 报 Illegal mix of collations。
 */
const TARGET_TABLES = [
  'payment_channels',
  'payment_orders',
  'payment_events',
  'payment_reconciliations',
  'payment_fees',
];

module.exports = {
  async up(query) {
    for (const table of TARGET_TABLES) {
      const [[row]] = await query(
        `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [table],
      );
      if (!Number(row?.c)) continue;
      await query(
        `ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
    }
  },
};
