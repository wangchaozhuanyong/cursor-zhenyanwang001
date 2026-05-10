module.exports = {
  async down(query) {
    const dropIndex = async (name) => {
      try {
        await query(`DROP INDEX ${name} ON product_tags`);
      } catch (e) {
        if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
      }
    };
    const dropColumn = async (name) => {
      try {
        await query(`ALTER TABLE product_tags DROP COLUMN ${name}`);
      } catch (e) {
        if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
      }
    };

    await dropIndex('idx_product_tags_enabled_sort');
    await dropIndex('idx_product_tags_deleted');
    await dropColumn('deleted_at');
    await dropColumn('updated_at');
    await dropColumn('enabled');
    await dropColumn('text_color');
    await dropColumn('bg_color');
  },
};
