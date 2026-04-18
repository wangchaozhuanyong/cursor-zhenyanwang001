module.exports = {
  async down(query) {
    try {
      await query('ALTER TABLE admin_logs DROP COLUMN operator');
    } catch (e) {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    }
  },
};
