module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS product_tag_assignments');
    try {
      await query('ALTER TABLE product_tags DROP COLUMN color');
    } catch (e) {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    }
  },
};
