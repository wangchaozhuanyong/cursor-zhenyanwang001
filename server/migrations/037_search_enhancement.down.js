module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS search_terms');
    await query('ALTER TABLE products DROP COLUMN search_keywords').catch((e) => {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    });
  },
};
