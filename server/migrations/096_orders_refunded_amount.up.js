module.exports = {
  async up(query) {
    await query(
      `ALTER TABLE orders
         ADD COLUMN refunded_amount DECIMAL(12,2) NOT NULL DEFAULT 0
         COMMENT '累计已退款金额(MYR)'
         AFTER total_amount`,
    ).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });
    await query(
      `UPDATE orders
         SET refunded_amount = total_amount
       WHERE payment_status = 'refunded' OR status = 'refunded'`,
    ).catch(() => {});
  },
};
