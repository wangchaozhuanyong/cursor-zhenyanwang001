async function hasColumn(query, table, column) {
  const [rows] = await query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
  return rows.length > 0;
}

module.exports = {
  name: '084_addresses_timestamps',
  async up(query) {
    if (!(await hasColumn(query, 'addresses', 'created_at'))) {
      await query(
        'ALTER TABLE addresses ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP AFTER is_default',
      );
    }
    if (!(await hasColumn(query, 'addresses', 'updated_at'))) {
      await query(
        'ALTER TABLE addresses ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
      );
    }
  },
};
