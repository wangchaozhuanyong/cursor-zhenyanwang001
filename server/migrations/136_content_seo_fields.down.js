module.exports = {
  async down(query) {
    const dropColumn = async (table, column) => {
      await query(`ALTER TABLE ${table} DROP COLUMN ${column}`).catch((e) => {
        if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
      });
    };

    await dropColumn('banners', 'description');
    await dropColumn('categories', 'seo_description');
    await dropColumn('categories', 'seo_title');
    await dropColumn('categories', 'faq_json');
    await dropColumn('categories', 'buying_guide');
    await dropColumn('categories', 'description');
  },
};
