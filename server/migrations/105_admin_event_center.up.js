const EVENT_RULES = [
  ['order.created', 'order', 'P3', '订单创建', 0, 0, null, null, 0],
  ['order.paid', 'order', 'P2', '订单已付款', 0, 0, null, null, 1],
  ['order.paid_unhandled_timeout', 'order', 'P1', '已付款订单超时未处理', 1, 0, 30, 'admin_manager', 1],
  ['order.ship_timeout', 'order', 'P1', '订单发货超时', 1, 0, 30, 'admin_manager', 1],
  ['order.profit_negative', 'order', 'P1', '订单利润为负', 1, 0, 30, 'admin_manager', 1],
  ['order.high_value', 'order', 'P1', '高价值订单', 1, 0, 30, 'admin_manager', 1],

  ['payment.success_order_not_paid', 'payment', 'P0', '支付成功但订单未支付', 1, 1, 5, 'boss', 1],
  ['payment.amount_mismatch', 'payment', 'P0', '支付金额不一致', 1, 1, 5, 'boss', 1],
  ['payment.currency_mismatch', 'payment', 'P0', '支付币种不一致', 1, 1, 5, 'boss', 1],
  ['payment.webhook_signature_failed', 'payment', 'P1', '支付回调签名失败', 1, 0, 30, 'admin_manager', 0],
  ['payment.webhook_rejected', 'payment', 'P1', '支付回调被拒绝', 1, 0, 30, 'admin_manager', 0],
  ['payment.manual_mark_paid', 'payment', 'P2', '手动标记已支付', 0, 0, null, null, 0],
  ['payment.reconciliation_failed', 'payment', 'P1', '支付对账失败', 1, 0, 30, 'admin_manager', 0],

  ['return.requested', 'refund', 'P2', '售后申请', 0, 0, null, null, 1],
  ['refund.requested', 'refund', 'P2', '退款申请', 0, 0, null, null, 1],
  ['refund.timeout_unhandled', 'refund', 'P1', '退款超时未处理', 1, 0, 30, 'admin_manager', 1],
  ['refund.exceeds_paid', 'refund', 'P0', '退款金额超过实付金额', 1, 1, 5, 'boss', 1],
  ['refund.failed', 'refund', 'P1', '退款失败', 1, 0, 30, 'admin_manager', 1],

  ['stock.low', 'stock', 'P2', '库存偏低', 0, 0, null, null, 1],
  ['stock.out', 'stock', 'P1', '库存售罄', 1, 0, 30, 'admin_manager', 1],
  ['stock.negative', 'stock', 'P1', '库存为负', 1, 0, 30, 'admin_manager', 1],
  ['stock.deduction_failed', 'stock', 'P1', '库存扣减失败', 1, 0, 30, 'admin_manager', 1],
  ['stock.rollback_failed', 'stock', 'P1', '库存回滚失败', 1, 0, 30, 'admin_manager', 1],
  ['stock.sku_missing', 'stock', 'P1', 'SKU 缺失', 1, 0, 30, 'admin_manager', 1],
  ['stock.manual_adjust_large', 'stock', 'P2', '大额库存手动调整', 0, 0, null, null, 0],

  ['product.price_zero', 'content', 'P1', '商品价格为零', 1, 0, 30, 'admin_manager', 1],
  ['product.cost_higher_than_price', 'content', 'P1', '商品成本高于售价', 1, 0, 30, 'admin_manager', 1],
  ['product.image_missing', 'content', 'P2', '商品图片缺失', 0, 0, null, null, 1],
  ['product.s3_image_missing', 'content', 'P2', '商品 S3 图片缺失', 0, 0, null, null, 1],
  ['product.no_stock_but_online', 'content', 'P2', '无库存商品仍在线', 0, 0, null, null, 1],
  ['banner.image_missing', 'content', 'P2', 'Banner 图片缺失', 0, 0, null, null, 1],
  ['content.page_empty', 'content', 'P2', '内容页面为空', 0, 0, null, null, 1],

  ['consistency.anomaly_p0', 'consistency', 'P0', 'P0 数据一致性异常', 1, 1, 5, 'boss', 1],
  ['consistency.anomaly_p1', 'consistency', 'P1', 'P1 数据一致性异常', 1, 0, 30, 'admin_manager', 1],
  ['PAYMENT_SUCCESS_ORDER_UNPAID', 'consistency', 'P0', '支付成功但订单未支付', 1, 1, 5, 'boss', 1],
  ['ORDER_PAYMENT_AMOUNT_MISMATCH', 'consistency', 'P0', '订单支付金额不一致', 1, 1, 5, 'boss', 1],
  ['POINTS_BALANCE_MISMATCH', 'consistency', 'P1', '积分余额不一致', 1, 0, 30, 'admin_manager', 1],
  ['SKU_NEGATIVE_STOCK', 'consistency', 'P1', 'SKU 负库存', 1, 0, 30, 'admin_manager', 1],
  ['REFUND_AMOUNT_EXCEEDS_PAID', 'consistency', 'P0', '退款金额超过实付金额', 1, 1, 5, 'boss', 1],
  ['FILE_OBJECT_MISSING', 'consistency', 'P2', '文件对象缺失', 0, 0, null, null, 1],

  ['security.admin_login_failed_many', 'security', 'P1', '管理员多次登录失败', 1, 0, 30, 'admin_manager', 0],
  ['security.admin_locked', 'security', 'P1', '管理员账号锁定', 1, 0, 30, 'admin_manager', 0],
  ['security.new_ip_login', 'security', 'P2', '管理员新 IP 登录', 0, 0, null, null, 0],
  ['security.rbac_change', 'security', 'P1', '权限配置变更', 1, 0, 30, 'admin_manager', 0],
  ['security.admin_user_created', 'security', 'P1', '管理员账号创建', 1, 0, 30, 'admin_manager', 0],
  ['security.admin_user_disabled', 'security', 'P1', '管理员账号禁用', 1, 0, 30, 'admin_manager', 0],
  ['security.data_export', 'security', 'P2', '后台数据导出', 0, 0, null, null, 0],
  ['security.permanent_delete', 'security', 'P1', '永久删除操作', 1, 0, 30, 'admin_manager', 0],
  ['security.payment_config_change', 'security', 'P1', '支付配置变更', 1, 0, 30, 'admin_manager', 0],
  ['security.site_settings_change', 'security', 'P1', '站点设置变更', 1, 0, 30, 'admin_manager', 0],
  ['security.payment_manual_change', 'security', 'P1', '支付状态手动变更', 1, 0, 30, 'admin_manager', 0],
  ['security.payment_event_replay', 'security', 'P1', '支付事件重放', 1, 0, 30, 'admin_manager', 0],
  ['security.refund_operation', 'security', 'P1', '退款操作', 1, 0, 30, 'admin_manager', 0],
  ['security.notification_config_change', 'security', 'P1', '通知配置变更', 1, 0, 30, 'admin_manager', 0],
  ['security.theme_change', 'security', 'P1', '主题配置变更', 1, 0, 30, 'admin_manager', 0],
  ['security.inventory_change', 'security', 'P1', '库存变更', 1, 0, 30, 'admin_manager', 0],
  ['security.return_operation', 'security', 'P1', '售后操作', 1, 0, 30, 'admin_manager', 0],
  ['security.export_operation', 'security', 'P2', '数据导出操作', 0, 0, null, null, 0],
  ['security.product_change', 'security', 'P2', '商品变更', 0, 0, null, null, 0],
  ['security.user_points_change', 'security', 'P1', '用户积分调整', 1, 0, 30, 'admin_manager', 0],
  ['security.user_password_reset', 'security', 'P1', '用户密码重置', 1, 0, 30, 'admin_manager', 0],
  ['security.user_status_change', 'security', 'P1', '用户账号状态变更', 1, 0, 30, 'admin_manager', 0],

  ['system.database_unavailable', 'system', 'P0', '数据库不可用', 1, 1, 5, 'boss', 1],
  ['system.redis_unavailable', 'system', 'P1', 'Redis 不可用', 1, 0, 30, 'admin_manager', 1],
  ['system.queue_failed', 'system', 'P1', '队列任务失败', 1, 0, 30, 'admin_manager', 1],
  ['system.queue_backlog_high', 'system', 'P1', '队列积压过高', 1, 0, 30, 'admin_manager', 1],
  ['system.scheduler_stopped', 'system', 'P1', '调度器停止', 1, 0, 30, 'admin_manager', 1],
  ['system.storage_unhealthy', 'system', 'P1', '存储服务异常', 1, 0, 30, 'admin_manager', 1],
  ['system.upload_failed', 'system', 'P2', '上传失败', 0, 0, null, null, 0],
  ['system.backup_failed', 'system', 'P1', '备份失败', 1, 0, 30, 'admin_manager', 1],
  ['system.api_error_spike', 'system', 'P1', 'API 错误激增', 1, 0, 30, 'admin_manager', 1],
];

module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS admin_event_records (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        category VARCHAR(40) NOT NULL,
        severity VARCHAR(8) NOT NULL DEFAULT 'P2',
        status VARCHAR(32) NOT NULL DEFAULT 'open',
        title VARCHAR(255) NOT NULL,
        message TEXT,
        entity_type VARCHAR(80) DEFAULT NULL,
        entity_id VARCHAR(120) DEFAULT NULL,
        fingerprint CHAR(64) NOT NULL,
        active_dedupe_key CHAR(64) DEFAULT NULL,
        payload JSON NULL,
        impact_amount DECIMAL(12,2) DEFAULT NULL,
        source VARCHAR(80) NOT NULL DEFAULT '',
        seen_count INT NOT NULL DEFAULT 1,
        first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        acknowledged_at DATETIME DEFAULT NULL,
        in_progress_at DATETIME DEFAULT NULL,
        resolved_at DATETIME DEFAULT NULL,
        expired_at DATETIME DEFAULT NULL,
        escalated_at DATETIME DEFAULT NULL,
        created_by VARCHAR(36) DEFAULT NULL,
        updated_by VARCHAR(36) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_admin_event_active_dedupe (active_dedupe_key),
        KEY idx_admin_event_status_severity (status, severity, last_seen_at),
        KEY idx_admin_event_type_status (event_type, status),
        KEY idx_admin_event_category_status (category, status),
        KEY idx_admin_event_entity (entity_type, entity_id),
        KEY idx_admin_event_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS admin_event_user_states (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        event_id VARCHAR(36) NOT NULL,
        admin_user_id VARCHAR(36) NOT NULL,
        read_at DATETIME DEFAULT NULL,
        hidden_at DATETIME DEFAULT NULL,
        sound_played_at DATETIME DEFAULT NULL,
        popup_seen_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_admin_event_user_state (event_id, admin_user_id),
        KEY idx_admin_event_user_read (admin_user_id, read_at),
        KEY idx_admin_event_user_hidden (admin_user_id, hidden_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS admin_event_actions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        event_id VARCHAR(36) NOT NULL,
        action_type VARCHAR(40) NOT NULL,
        from_status VARCHAR(32) DEFAULT NULL,
        to_status VARCHAR(32) DEFAULT NULL,
        operator_id VARCHAR(36) DEFAULT NULL,
        operator_type VARCHAR(32) NOT NULL DEFAULT 'admin',
        remark VARCHAR(1000) DEFAULT NULL,
        metadata JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_admin_event_actions_event (event_id, created_at),
        KEY idx_admin_event_actions_type (action_type, created_at),
        KEY idx_admin_event_actions_operator (operator_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS admin_event_rules (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        category VARCHAR(40) NOT NULL,
        severity VARCHAR(8) NOT NULL DEFAULT 'P2',
        title VARCHAR(255) NOT NULL,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        popup_enabled TINYINT(1) NOT NULL DEFAULT 0,
        sound_enabled TINYINT(1) NOT NULL DEFAULT 0,
        escalation_minutes INT DEFAULT NULL,
        escalation_target VARCHAR(80) DEFAULT NULL,
        auto_resolve_enabled TINYINT(1) NOT NULL DEFAULT 0,
        config JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_admin_event_rules_type (event_type),
        KEY idx_admin_event_rules_category (category),
        KEY idx_admin_event_rules_enabled (enabled, severity)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    for (const row of EVENT_RULES) {
      await query(
        `INSERT INTO admin_event_rules
          (event_type, category, severity, title, enabled, popup_enabled, sound_enabled, escalation_minutes, escalation_target, auto_resolve_enabled)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          category = VALUES(category),
          severity = VALUES(severity),
          title = VALUES(title),
          popup_enabled = VALUES(popup_enabled),
          sound_enabled = VALUES(sound_enabled),
          escalation_minutes = VALUES(escalation_minutes),
          escalation_target = VALUES(escalation_target),
          auto_resolve_enabled = VALUES(auto_resolve_enabled)`,
        row,
      );
    }

    const perms = [
      ['event.view', '后台事件查看', 190],
      ['event.manage', '后台事件处理', 191],
      ['event.rule.manage', '后台事件规则管理', 192],
    ];
    for (const row of perms) {
      await query('INSERT IGNORE INTO permissions (code, name, sort_order) VALUES (?, ?, ?)', row);
    }
    for (const roleCode of ['super_admin', 'admin_manager']) {
      await query(
        `INSERT IGNORE INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id
         FROM roles r
         JOIN permissions p ON p.code IN ('event.view', 'event.manage', 'event.rule.manage')
         WHERE r.code = ?`,
        [roleCode],
      );
    }
  },
};
