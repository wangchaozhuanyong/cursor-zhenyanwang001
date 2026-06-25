async function columnExists(query, table, column) {
  const [rows] = await query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return rows.length > 0;
}

async function addColumnIfMissing(query, table, column, definition) {
  if (await columnExists(query, table, column)) return;
  await query(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
}

module.exports = {
  async up(query) {
    await addColumnIfMissing(
      query,
      'categories',
      'banner_image_url',
      "banner_image_url VARCHAR(500) NOT NULL DEFAULT '' AFTER icon_url",
    );
    await addColumnIfMissing(
      query,
      'categories',
      'banner_title',
      "banner_title VARCHAR(120) NOT NULL DEFAULT '' AFTER banner_image_url",
    );
    await addColumnIfMissing(
      query,
      'categories',
      'banner_subtitle',
      "banner_subtitle VARCHAR(240) NOT NULL DEFAULT '' AFTER banner_title",
    );
    await addColumnIfMissing(
      query,
      'categories',
      'banner_link',
      "banner_link VARCHAR(500) NOT NULL DEFAULT '' AFTER banner_subtitle",
    );
    await addColumnIfMissing(
      query,
      'categories',
      'banner_enabled',
      'banner_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER banner_link',
    );
  },
};
