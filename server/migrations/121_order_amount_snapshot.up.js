async function hasColumn(query, table, column) {
  const [rows] = await query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return rows.length > 0;
}

async function addColumn(query, table, column, sql) {
  if (!(await hasColumn(query, table, column))) await query(sql);
}

module.exports = {
  async up(query) {
    await addColumn(query, 'orders', 'goods_original_amount',
      "ALTER TABLE orders ADD COLUMN goods_original_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '商品原价总额' AFTER raw_amount");
    await addColumn(query, 'orders', 'goods_sale_amount',
      "ALTER TABLE orders ADD COLUMN goods_sale_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '商品成交价总额' AFTER goods_original_amount");
    await addColumn(query, 'orders', 'activity_discount_amount',
      "ALTER TABLE orders ADD COLUMN activity_discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '活动优惠：秒杀/满减/会员折扣' AFTER discount_amount");
    await addColumn(query, 'orders', 'coupon_discount_amount',
      "ALTER TABLE orders ADD COLUMN coupon_discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '优惠券抵扣' AFTER activity_discount_amount");
    await addColumn(query, 'orders', 'shipping_original_fee',
      "ALTER TABLE orders ADD COLUMN shipping_original_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '原始运费' AFTER shipping_fee");
    await addColumn(query, 'orders', 'shipping_discount_amount',
      "ALTER TABLE orders ADD COLUMN shipping_discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '运费减免' AFTER shipping_original_fee");
    await addColumn(query, 'orders', 'total_discount_amount',
      "ALTER TABLE orders ADD COLUMN total_discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '总减免金额' AFTER reward_cash_discount_amount");
    await addColumn(query, 'orders', 'payable_amount',
      "ALTER TABLE orders ADD COLUMN payable_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '应付金额' AFTER total_amount");
    await addColumn(query, 'orders', 'paid_amount',
      "ALTER TABLE orders ADD COLUMN paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '实付金额' AFTER payable_amount");
    await addColumn(query, 'orders', 'net_received_amount',
      "ALTER TABLE orders ADD COLUMN net_received_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '净实收金额' AFTER paid_amount");
    await addColumn(query, 'orders', 'outstanding_amount',
      "ALTER TABLE orders ADD COLUMN outstanding_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '待收金额' AFTER net_received_amount");
    await addColumn(query, 'orders', 'amount_snapshot',
      "ALTER TABLE orders ADD COLUMN amount_snapshot JSON NULL COMMENT '订单金额快照' AFTER discount_meta");

    await query(`
      UPDATE orders
         SET goods_original_amount = CASE WHEN goods_original_amount = 0 THEN COALESCE(raw_amount, 0) ELSE goods_original_amount END,
             goods_sale_amount = CASE WHEN goods_sale_amount = 0 THEN COALESCE(raw_amount, 0) ELSE goods_sale_amount END,
             payable_amount = CASE WHEN payable_amount = 0 THEN COALESCE(total_amount, 0) ELSE payable_amount END,
             paid_amount = CASE
               WHEN paid_amount = 0 AND payment_status IN ('paid','partially_refunded','refunded') THEN COALESCE(total_amount, 0)
               ELSE paid_amount
             END,
             net_received_amount = CASE
               WHEN net_received_amount = 0 AND payment_status IN ('paid','partially_refunded','refunded')
                 THEN GREATEST(0, COALESCE(total_amount, 0) - COALESCE(refunded_amount, 0))
               ELSE net_received_amount
             END,
             outstanding_amount = CASE
               WHEN payment_status IN ('paid','partially_refunded','refunded') THEN 0
               ELSE COALESCE(total_amount, 0)
             END
    `);
  },
};
