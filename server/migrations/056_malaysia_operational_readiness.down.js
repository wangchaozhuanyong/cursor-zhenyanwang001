module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS privacy_consents').catch(() => {});
    await query('DROP INDEX idx_checkout_abandonments_reminder ON checkout_abandonments').catch(() => {});
    await query('DROP INDEX idx_return_requests_order_item ON return_requests').catch(() => {});
    await query('DROP INDEX idx_orders_address_state ON orders').catch(() => {});
    await query('DROP INDEX idx_orders_payment_provider ON orders').catch(() => {});
    await query('DROP INDEX idx_order_items_variant ON order_items').catch(() => {});
    await query('DROP INDEX uk_cart_user_product_variant ON cart_items').catch(() => {});
    await query('CREATE UNIQUE INDEX uk_cart_user_product ON cart_items (user_id, product_id)').catch(() => {});
    for (const column of ['sku_code', 'variant_id']) {
      await query(`ALTER TABLE cart_items DROP COLUMN ${column}`).catch(() => {});
    }
    for (const column of [
      'refund_status',
      'paid_at',
      'provider_payment_id',
      'payment_provider',
      'address_country',
      'address_postcode',
      'address_state',
      'address_city',
      'address_line2',
      'address_line1',
    ]) {
      await query(`ALTER TABLE orders DROP COLUMN ${column}`).catch(() => {});
    }
    for (const column of ['subtotal', 'variant_name', 'sku_code', 'variant_id']) {
      await query(`ALTER TABLE order_items DROP COLUMN ${column}`).catch(() => {});
    }
    for (const column of ['quantity', 'sku_code', 'variant_id', 'product_id', 'order_item_id']) {
      await query(`ALTER TABLE return_requests DROP COLUMN ${column}`).catch(() => {});
    }
    for (const column of ['reminder_channel', 'next_reminder_at', 'last_reminded_at', 'reminder_count']) {
      await query(`ALTER TABLE checkout_abandonments DROP COLUMN ${column}`).catch(() => {});
    }
  },
};
