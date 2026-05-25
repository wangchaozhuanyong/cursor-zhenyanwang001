async function dropColumn(query, table, column) {
  await query(`ALTER TABLE ${table} DROP COLUMN ${column}`).catch(() => {});
}

module.exports = {
  async down(query) {
    for (const col of [
      'amount_snapshot',
      'outstanding_amount',
      'net_received_amount',
      'paid_amount',
      'payable_amount',
      'total_discount_amount',
      'shipping_discount_amount',
      'shipping_original_fee',
      'coupon_discount_amount',
      'activity_discount_amount',
      'goods_sale_amount',
      'goods_original_amount',
    ]) {
      await dropColumn(query, 'orders', col);
    }
  },
};
