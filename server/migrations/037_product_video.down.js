module.exports = {
  async down(query) {
    await query('ALTER TABLE products DROP COLUMN video_url').catch((e) => {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    });
  },
};
