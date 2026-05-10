module.exports = {
  async down(query) {
    try {
      await query('DROP INDEX idx_orders_shipped_auto_confirm ON orders');
    } catch (e) {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    }
    try {
      await query('ALTER TABLE orders DROP COLUMN shipped_at');
    } catch (e) {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    }
  },
};
