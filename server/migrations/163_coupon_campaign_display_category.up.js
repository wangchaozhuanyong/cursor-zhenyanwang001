async function columnExists(query, table, column) {
  const [rows] = await query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return rows.length > 0;
}

module.exports = {
  async up(query) {
    if (!(await columnExists(query, 'coupon_campaigns', 'display_category'))) {
      await query(
        "ALTER TABLE coupon_campaigns ADD COLUMN display_category VARCHAR(32) NOT NULL DEFAULT '' AFTER display_positions",
      );
    }
  },
};
