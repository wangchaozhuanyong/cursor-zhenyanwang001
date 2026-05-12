module.exports = {
  /**
   * user_statistics_events: 统计幂等去重表
   *
   * 目标：
   * - 避免支付回调重放 / 队列重试 / 管理员重复操作导致 user_statistics 重复累计
   * - 通过 UNIQUE(event_type, order_id) 保证“同一订单同一事件”只记录一次
   */
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS user_statistics_events (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL COMMENT 'users.id',
        order_id VARCHAR(36) NOT NULL COMMENT 'orders.id',
        event_type VARCHAR(20) NOT NULL COMMENT 'paid | cancelled | refunded',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

        UNIQUE KEY uniq_stats_event (event_type, order_id),
        KEY idx_stats_event_user_time (user_id, created_at),
        CONSTRAINT fk_stats_event_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_stats_event_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};

