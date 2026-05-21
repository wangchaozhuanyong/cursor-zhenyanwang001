async function dropVersionColumn(query, table) {
  try {
    await query(`ALTER TABLE ${table} DROP COLUMN version`);
  } catch {
    // Keep down migration idempotent across environments where the column is absent.
  }
}

module.exports = {
  async down(query) {
    for (const table of ['site_settings', 'categories', 'banners', 'products']) {
      await dropVersionColumn(query, table);
    }
  },
};
