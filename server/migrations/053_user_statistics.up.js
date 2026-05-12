module.exports = {
  /**
   * user_statistics: 用户画像/消费统计（CRM Analytics）
   * 说明：
   * - 与 users 表一对一，通过 user_id 关联
   * - 存放可增量维护的聚合指标，避免后台列表实时 SUM()
   * - 金额字段统一使用 DECIMAL(12,2)（RM 级别）
   */
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS user_statistics (
        user_id VARCHAR(36) NOT NULL PRIMARY KEY COMMENT 'users.id（一对一）',

        -- RFM / 消费指标
        total_spent DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '累计实际支付金额（成功支付，扣除取消；退款另算）',
        valid_order_count INT NOT NULL DEFAULT 0 COMMENT '有效付款订单数（支付成功且未取消）',
        average_order_value DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '客单价 AOV = total_spent / valid_order_count（存储列，便于排序）',

        -- 时间周期指标
        first_purchase_at DATETIME NULL DEFAULT NULL COMMENT '首单支付成功时间',
        last_purchase_at DATETIME NULL DEFAULT NULL COMMENT '最近一次支付成功时间',

        -- 风控/售后指标
        cancelled_order_count INT NOT NULL DEFAULT 0 COMMENT '取消订单数（可增量维护）',
        refund_count INT NOT NULL DEFAULT 0 COMMENT '退货/退款成功次数',
        refund_rate DECIMAL(6,4) NOT NULL DEFAULT 0 COMMENT '退款率 = refund_count / valid_order_count（0~1，小数）',

        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        CONSTRAINT fk_user_statistics_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        KEY idx_user_stats_total_spent (total_spent),
        KEY idx_user_stats_last_purchase (last_purchase_at),
        KEY idx_user_stats_refund_rate (refund_rate)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};

