module.exports = {
  async down(query) {
    try {
      await query('ALTER TABLE users DROP COLUMN email');
    } catch (e) {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    }
  },
};
