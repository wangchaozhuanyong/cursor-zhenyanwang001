async function dropColumn(query, table, column) {
  await query(`ALTER TABLE ${table} DROP COLUMN ${column}`).catch(() => {});
}

module.exports = {
  async down(query) {
    await query('DROP INDEX idx_order_items_profit_order ON order_items').catch(() => {});
    await query('DROP INDEX idx_orders_profit_date ON orders').catch(() => {});
    await query('DROP TABLE IF EXISTS operating_expense_records').catch(() => {});

    for (const col of [
      'net_profit_amount',
      'payment_fee_amount',
      'shipping_cost_amount',
      'gross_profit_amount',
      'goods_net_sales_amount',
      'goods_cost_amount',
    ]) {
      await dropColumn(query, 'orders', col);
    }

    for (const col of [
      'cost_snapshot_source',
      'gross_profit_amount',
      'net_sales_amount',
      'discount_allocated',
      'cost_amount',
      'unit_cost_price',
    ]) {
      await dropColumn(query, 'order_items', col);
    }
  },
};
