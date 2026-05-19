async function hasColumn(query, table, column) {
  const [rows] = await query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
  return rows.length > 0;
}

module.exports = {
  name: '085_orders_review_timestamps',
  async up(query) {
    if (!(await hasColumn(query, 'orders', 'completed_at'))) {
      await query(
        'ALTER TABLE orders ADD COLUMN completed_at DATETIME DEFAULT NULL AFTER created_at',
      );
    }
    if (!(await hasColumn(query, 'orders', 'updated_at'))) {
      await query(
        'ALTER TABLE orders ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER completed_at',
      );
    }
  },
};
