module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS inventory_replenishment_alerts');
    await query('DROP TABLE IF EXISTS purchase_order_items');
    await query('DROP TABLE IF EXISTS purchase_orders');
  },
};
