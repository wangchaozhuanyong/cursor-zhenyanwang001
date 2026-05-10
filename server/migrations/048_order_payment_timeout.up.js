/**
 * 未支付订单超时关单：记录取消信息，并给订单明细保存活动快照用于回滚活动销量。
 */
module.exports = {
  async up(query) {
    const alterStatements = [
      `ALTER TABLE orders
         ADD COLUMN cancelled_at DATETIME NULL COMMENT '订单取消时间' AFTER created_at`,
      `ALTER TABLE orders
         ADD COLUMN cancel_reason VARCHAR(255) NOT NULL DEFAULT '' COMMENT '订单取消原因' AFTER cancelled_at`,
      `ALTER TABLE order_items
         ADD COLUMN activity_id VARCHAR(36) NULL COMMENT '下单时命中的活动 ID' AFTER qty`,
      `ALTER TABLE order_items
         ADD COLUMN activity_title VARCHAR(100) NULL COMMENT '下单时命中的活动标题' AFTER activity_id`,
    ];

    for (const sql of alterStatements) {
      try {
        await query(sql);
      } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      }
    }

    try {
      await query(
        'CREATE INDEX idx_orders_unpaid_timeout ON orders (status, payment_status, created_at)',
      );
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    }

    try {
      await query('CREATE INDEX idx_order_items_activity ON order_items (activity_id, product_id)');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    }
  },
};
