async function dropColumnIfExists(query, table, column) {
  await query(`ALTER TABLE ${table} DROP COLUMN ${column}`).catch((err) => {
    if (err.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw err;
  });
}

module.exports = {
  async down(query) {
    await dropColumnIfExists(query, 'coupon_campaigns', 'display_category');
  },
};
