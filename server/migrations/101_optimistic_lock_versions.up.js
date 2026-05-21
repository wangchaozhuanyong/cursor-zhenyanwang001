async function columnExists(query, table, column) {
  const [rows] = await query(
    `SELECT 1
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1`,
    [table, column],
  );
  return rows.length > 0;
}

async function addVersionColumn(query, table) {
  if (await columnExists(query, table, 'version')) return;
  await query(`ALTER TABLE ${table} ADD COLUMN version INT NOT NULL DEFAULT 1`);
}

module.exports = async function up({ query }) {
  for (const table of ['products', 'banners', 'categories', 'site_settings']) {
    await addVersionColumn(query, table);
  }
};
