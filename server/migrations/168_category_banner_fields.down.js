async function dropColumnIfExists(query, table, column) {
  await query(`ALTER TABLE ${table} DROP COLUMN ${column}`).catch((err) => {
    if (err.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw err;
  });
}

module.exports = {
  async down(query) {
    await dropColumnIfExists(query, 'categories', 'banner_enabled');
    await dropColumnIfExists(query, 'categories', 'banner_link');
    await dropColumnIfExists(query, 'categories', 'banner_subtitle');
    await dropColumnIfExists(query, 'categories', 'banner_title');
    await dropColumnIfExists(query, 'categories', 'banner_image_url');
  },
};
