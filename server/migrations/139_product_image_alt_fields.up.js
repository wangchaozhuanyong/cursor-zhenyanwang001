module.exports = {
  async up(query) {
    const addColumn = async (sql) => {
      await query(sql).catch((e) => {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      });
    };

    await addColumn(`
      ALTER TABLE products
      ADD COLUMN cover_image_alt VARCHAR(255) NOT NULL DEFAULT '' AFTER cover_image
    `);

    await addColumn(`
      ALTER TABLE products
      ADD COLUMN image_alt_json JSON NULL AFTER images
    `);
  },
};
