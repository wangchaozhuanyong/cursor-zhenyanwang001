/**
 * 订单履约状态 (status) 与支付状态 (payment_status) 拆分。
 * 报表与支付口径优先使用 payment_status。
 */
module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE orders
      ADD COLUMN payment_status
      ENUM('pending','paid','failed','refunded','partially_refunded')
      NOT NULL DEFAULT 'pending'
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    await query(`
      UPDATE orders SET payment_status = CASE
        WHEN status = 'refunded' THEN 'refunded'
        WHEN status IN ('paid','shipped','completed','refunding') THEN 'paid'
        ELSE 'pending'
      END
    `);

    await query(`
      CREATE INDEX idx_orders_payment_status ON orders (payment_status)
    `).catch((e) => {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    });
  },
};
