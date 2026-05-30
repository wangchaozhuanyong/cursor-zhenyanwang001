module.exports = {
  async down(query) {
    const dropColumn = async (column) => {
      await query(`ALTER TABLE products DROP COLUMN ${column}`).catch((e) => {
        if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
      });
    };

    await dropColumn('image_alt_json');
    await dropColumn('cover_image_alt');
  },
};
