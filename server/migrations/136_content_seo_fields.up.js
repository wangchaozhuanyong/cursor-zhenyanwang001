module.exports = {
  async up(query) {
    const addColumn = async (sql) => {
      await query(sql).catch((e) => {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      });
    };

    await addColumn(`
      ALTER TABLE categories
      ADD COLUMN description TEXT NULL AFTER name
    `);

    await addColumn(`
      ALTER TABLE categories
      ADD COLUMN buying_guide TEXT NULL AFTER description
    `);

    await addColumn(`
      ALTER TABLE categories
      ADD COLUMN faq_json JSON NULL AFTER buying_guide
    `);

    await addColumn(`
      ALTER TABLE categories
      ADD COLUMN seo_title VARCHAR(255) DEFAULT '' AFTER faq_json
    `);

    await addColumn(`
      ALTER TABLE categories
      ADD COLUMN seo_description TEXT NULL AFTER seo_title
    `);

    await addColumn(`
      ALTER TABLE banners
      ADD COLUMN description TEXT NULL AFTER title
    `);
  },
};
