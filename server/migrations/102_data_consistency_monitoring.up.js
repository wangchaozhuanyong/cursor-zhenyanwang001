const RULES = [
  ['PRODUCT_STOCK_MISMATCH', 'product', '商品主表库存与 SKU 汇总不一致', 'products.stock 与 product_variants.stock 汇总不一致。', 'P2', '0 3 * * *', 1],
  ['SKU_NEGATIVE_STOCK', 'product', 'SKU 库存为负数', 'product_variants.stock 小于 0。', 'P1', '*/30 * * * *', 0],
  ['PAYMENT_SUCCESS_ORDER_UNPAID', 'payment', '支付成功但订单未支付', 'payment_orders 已支付，但 orders 仍未支付。', 'P0', '*/10 * * * *', 0],
  ['ORDER_PAYMENT_AMOUNT_MISMATCH', 'payment', '订单应付金额与支付金额不一致', 'orders.total_amount 与成功 payment_orders.amount 不一致。', 'P0', '*/15 * * * *', 0],
  ['REFUND_AMOUNT_EXCEEDS_PAID', 'payment', '退款金额超过实付金额', 'orders.refunded_amount 大于 orders.total_amount。', 'P0', '*/15 * * * *', 0],
  ['POINTS_BALANCE_MISMATCH', 'loyalty', '积分余额与流水不一致', 'points_accounts/users 余额与 points_records 成功流水汇总不一致。', 'P1', '*/30 * * * *', 0],
  ['ORDER_CANCELLED_STOCK_NOT_RESTORED', 'order', '订单取消后库存疑似未回滚', '取消订单缺少库存回滚证据。', 'P2', '0 * * * *', 0],
  ['CACHE_STALE_AFTER_ADMIN_UPDATE', 'cache', '后台更新后缓存疑似过期', '关键缓存元数据早于数据库更新时间。', 'P2', '*/30 * * * *', 1],
  ['FILE_OBJECT_MISSING', 'file', '数据库文件对象缺失', '商品、SKU、Banner 或内容图片路径在存储中不存在。', 'P2', '0 4 * * *', 0],
  ['USER_STATS_MISMATCH', 'user', '用户统计数据不一致', 'user_statistics 与订单、退款、积分真实汇总不一致。', 'P2', '0 5 * * *', 1],
];

module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS data_consistency_rules (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(80) NOT NULL,
        module VARCHAR(40) NOT NULL,
        title VARCHAR(160) NOT NULL,
        description VARCHAR(1000) NOT NULL DEFAULT '',
        severity VARCHAR(8) NOT NULL DEFAULT 'P2',
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        schedule_cron VARCHAR(100) DEFAULT NULL,
        auto_fix_enabled TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_dcr_code (code),
        KEY idx_dcr_enabled (enabled),
        KEY idx_dcr_module (module)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS data_consistency_runs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        run_type VARCHAR(32) NOT NULL DEFAULT 'manual',
        rule_code VARCHAR(80) DEFAULT NULL,
        status VARCHAR(24) NOT NULL DEFAULT 'running',
        checked_count INT NOT NULL DEFAULT 0,
        anomaly_count INT NOT NULL DEFAULT 0,
        started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME DEFAULT NULL,
        duration_ms INT DEFAULT NULL,
        error_message TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_dcruns_rule_started (rule_code, started_at),
        KEY idx_dcruns_status_started (status, started_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS data_consistency_anomalies (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        rule_code VARCHAR(80) NOT NULL,
        module VARCHAR(40) NOT NULL,
        severity VARCHAR(8) NOT NULL,
        entity_type VARCHAR(80) NOT NULL,
        entity_id VARCHAR(120) NOT NULL,
        title VARCHAR(255) NOT NULL,
        expected_value JSON NULL,
        actual_value JSON NULL,
        diff_value JSON NULL,
        root_cause_code VARCHAR(64) NOT NULL DEFAULT 'UNKNOWN',
        root_cause_message VARCHAR(1000) NOT NULL DEFAULT '',
        evidence JSON NULL,
        dedupe_hash CHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'open',
        seen_count INT NOT NULL DEFAULT 1,
        first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME DEFAULT NULL,
        resolved_by VARCHAR(36) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_dca_dedupe_hash (dedupe_hash),
        KEY idx_dca_status_severity (status, severity),
        KEY idx_dca_rule_status (rule_code, status),
        KEY idx_dca_module_status (module, status),
        KEY idx_dca_entity (entity_type, entity_id),
        KEY idx_dca_last_seen (last_seen_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS data_repair_tasks (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        anomaly_id BIGINT UNSIGNED NOT NULL,
        repair_type VARCHAR(80) NOT NULL,
        repair_status VARCHAR(32) NOT NULL DEFAULT 'pending',
        before_snapshot JSON NULL,
        after_snapshot JSON NULL,
        suggestion JSON NULL,
        operator_id VARCHAR(36) DEFAULT NULL,
        remark VARCHAR(1000) DEFAULT NULL,
        executed_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_drt_anomaly (anomaly_id),
        KEY idx_drt_status_created (repair_status, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS data_change_events (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        request_id VARCHAR(80) DEFAULT NULL,
        module VARCHAR(40) NOT NULL,
        entity_type VARCHAR(80) NOT NULL,
        entity_id VARCHAR(120) NOT NULL,
        action VARCHAR(80) NOT NULL,
        actor_type VARCHAR(40) NOT NULL DEFAULT 'system',
        actor_id VARCHAR(120) DEFAULT NULL,
        source VARCHAR(80) NOT NULL DEFAULT '',
        before_data JSON NULL,
        after_data JSON NULL,
        ip VARCHAR(64) DEFAULT NULL,
        user_agent VARCHAR(512) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_dce_entity_created (entity_type, entity_id, created_at),
        KEY idx_dce_module_created (module, created_at),
        KEY idx_dce_actor_created (actor_type, actor_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS data_consistency_rule_events (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        rule_code VARCHAR(80) NOT NULL,
        event_type VARCHAR(80) NOT NULL,
        payload JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_dcre_rule_created (rule_code, created_at),
        KEY idx_dcre_event_created (event_type, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS cache_meta (
        cache_key VARCHAR(191) NOT NULL PRIMARY KEY,
        module VARCHAR(40) NOT NULL DEFAULT '',
        entity_type VARCHAR(80) NOT NULL DEFAULT '',
        entity_id VARCHAR(120) NOT NULL DEFAULT '',
        cache_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        db_updated_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_cache_meta_entity (entity_type, entity_id),
        KEY idx_cache_meta_module (module)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    for (const [code, moduleName, title, description, severity, cron, autoFix] of RULES) {
      await query(
        `INSERT INTO data_consistency_rules
          (code, module, title, description, severity, enabled, schedule_cron, auto_fix_enabled)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)
         ON DUPLICATE KEY UPDATE
          module = VALUES(module),
          title = VALUES(title),
          description = VALUES(description),
          severity = VALUES(severity),
          schedule_cron = VALUES(schedule_cron)`,
        [code, moduleName, title, description, severity, cron, autoFix],
      );
    }

    const perms = [
      ['monitoring.view', '数据一致性监控查看', 180],
      ['monitoring.manage', '数据一致性监控管理', 181],
      ['monitoring.repair', '数据一致性修复执行', 182],
    ];
    for (const row of perms) {
      await query(`INSERT IGNORE INTO permissions (code, name, sort_order) VALUES (?, ?, ?)`, row);
    }
    for (const roleCode of ['super_admin', 'admin_manager']) {
      await query(
        `INSERT IGNORE INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id
         FROM roles r
         JOIN permissions p ON p.code IN ('monitoring.view', 'monitoring.manage', 'monitoring.repair')
         WHERE r.code = ?`,
        [roleCode],
      );
    }
  },
};
