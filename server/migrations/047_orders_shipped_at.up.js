/**
 * 订单首次发货时间：用于「发货后 N 天自动确认收货」。
 */
module.exports = {
  async up(query) {
    try {
      await query(`
        ALTER TABLE orders
          ADD COLUMN shipped_at DATETIME NULL COMMENT '首次发货时间（自动确认收货计时起点）' AFTER carrier
      `);
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }
    try {
      await query(
        'CREATE INDEX idx_orders_shipped_auto_confirm ON orders (status, shipped_at)',
      );
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    }
  },
};
