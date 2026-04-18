module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS payment_webhook_events');
    await query('DROP INDEX idx_orders_payment_transaction_no ON orders').catch(() => {});
    await query('DROP INDEX idx_orders_payment_time ON orders').catch(() => {});
    await query('ALTER TABLE orders DROP COLUMN payment_transaction_no').catch(() => {});
    await query('ALTER TABLE orders DROP COLUMN payment_channel').catch(() => {});
    await query('ALTER TABLE orders DROP COLUMN payment_time').catch(() => {});
  },
};
