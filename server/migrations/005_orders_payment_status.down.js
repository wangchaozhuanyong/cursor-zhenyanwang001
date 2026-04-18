module.exports = {
  async down(query) {
    await query('DROP INDEX idx_orders_payment_status ON orders').catch(() => {});
    await query('ALTER TABLE orders DROP COLUMN payment_status').catch((e) => {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    });
  },
};
