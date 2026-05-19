module.exports = {
  async down(query) {
    await query(`
      ALTER TABLE shipping_templates DROP COLUMN is_default
    `).catch((e) => {
      if (e.code !== 'ER_CANT_DROP_FIELD' && e.code !== 'ER_BAD_FIELD_ERROR') throw e;
    });
  },
};
