module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS points_gift_redemptions');
    await query('DROP TABLE IF EXISTS points_gift_items');
    const dropOrderCol = async () => {
      try {
        await query('ALTER TABLE orders DROP COLUMN order_type');
      } catch (_) { /* ignore */ }
    };
    const dropUserCols = async () => {
      for (const col of ['birthday_locked', 'birthday_updated_at', 'birthday']) {
        try {
          await query(`ALTER TABLE users DROP COLUMN ${col}`);
        } catch (_) { /* ignore */ }
      }
    };
    await dropOrderCol();
    await dropUserCols();
  },
};
