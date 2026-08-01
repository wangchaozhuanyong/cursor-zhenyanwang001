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
      'banners',
      'image_mobile',
      "image_mobile VARCHAR(500) NOT NULL DEFAULT '' AFTER image",
    );
    await addColumnIfMissing(
      query,
      'banners',
      'image_desktop',
      "image_desktop VARCHAR(500) NOT NULL DEFAULT '' AFTER image_mobile",
    );
  },
};
