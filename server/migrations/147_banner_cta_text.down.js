module.exports = {
  async down(query) {
    await query(`
      ALTER TABLE banners
      DROP COLUMN cta_text
    `).catch((e) => {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    });
  },
};
