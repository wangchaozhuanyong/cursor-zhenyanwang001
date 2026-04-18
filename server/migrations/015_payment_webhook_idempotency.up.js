/**
 * 支付闭环补充：
 * 1) orders 增加支付回写字段（时间/渠道/交易号）
 * 2) payment_webhook_events 用于 webhook 事件幂等去重
 */
module.exports = {
  async up(query) {
    await query(
      `ALTER TABLE orders
       ADD COLUMN payment_time DATETIME NULL DEFAULT NULL`,
    ).catch(() => {});
    await query(
      `ALTER TABLE orders
       ADD COLUMN payment_channel VARCHAR(32) NOT NULL DEFAULT ''`,
    ).catch(() => {});
    await query(
      `ALTER TABLE orders
       ADD COLUMN payment_transaction_no VARCHAR(128) NOT NULL DEFAULT ''`,
    ).catch(() => {});
    await query(
      'CREATE INDEX idx_orders_payment_time ON orders (payment_time)',
    ).catch(() => {});
    await query(
      'CREATE INDEX idx_orders_payment_transaction_no ON orders (payment_transaction_no)',
    ).catch(() => {});

    await query(
      `CREATE TABLE IF NOT EXISTS payment_webhook_events (
        event_id VARCHAR(128) NOT NULL PRIMARY KEY,
        event_type VARCHAR(64) NOT NULL,
        order_id VARCHAR(36) DEFAULT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'processed',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    await query(
      'CREATE INDEX idx_payment_webhook_events_order_id ON payment_webhook_events (order_id)',
    ).catch(() => {});
  },
};
