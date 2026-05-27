async function columnExists(query, table, column) {
  const [rows] = await query(
    `SELECT 1
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1`,
    [table, column],
  );
  return rows.length > 0;
}

async function addColumn(query, table, column, ddl) {
  if (await columnExists(query, table, column)) return;
  await query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

async function seedAdminEventRule(query, row) {
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

async function seedMonitoringRule(query, row) {
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
    row,
  );
}

const SECURITY_EVENT_RULES = [
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
];

const MONITORING_RULES = [
  ['DB_CONNECTION_UNHEALTHY', 'system', '数据库连接异常', '数据库连接或基础查询不可用。', 'P0', '*/5 * * * *', 0],
  ['REDIS_UNHEALTHY', 'system', 'Redis 异常', 'Redis ping 或队列依赖不可用。', 'P1', '*/5 * * * *', 0],
  ['BULLMQ_QUEUE_BACKLOG_HIGH', 'system', '队列积压过高', 'BullMQ 等待/延迟任务数量超过阈值。', 'P1', '*/5 * * * *', 0],
  ['BULLMQ_FAILED_JOBS_HIGH', 'system', '队列失败任务过多', 'BullMQ 近期失败任务数量超过阈值。', 'P1', '*/10 * * * *', 0],
  ['SCHEDULER_NOT_RUNNING', 'system', '调度器未运行', '监控调度器最近未按预期触发。', 'P1', '*/5 * * * *', 0],
  ['API_ERROR_RATE_HIGH', 'system', 'API 错误率过高', '后台审计或运行记录显示近期 API 错误率过高。', 'P1', '*/10 * * * *', 0],
  ['DISK_SPACE_LOW', 'system', '磁盘空间不足', '运行环境磁盘可用空间低于阈值。', 'P1', '*/30 * * * *', 0],
  ['STORAGE_S3_UNHEALTHY', 'system', '对象存储异常', 'S3/对象存储健康检查失败。', 'P1', '*/15 * * * *', 0],
  ['BACKUP_RECENT_FAILED', 'backup', '最近备份失败', '最近备份任务失败或没有可用成功备份。', 'P1', '*/30 * * * *', 0],
  ['BACKUP_DRILL_RECENT_FAILED', 'backup', '最近恢复演练失败', '恢复演练近期失败或长期未执行成功。', 'P1', '0 * * * *', 0],

  ['ORDER_PAID_BUT_NO_STOCK_RECORD', 'order', '已支付订单缺少库存扣减记录', '订单已支付但没有库存扣减流水。', 'P1', '*/30 * * * *', 0],
  ['ORDER_COMPLETED_BUT_USER_STATS_NOT_UPDATED', 'order', '完成订单未同步用户统计', '订单完成后用户统计未更新。', 'P2', '0 * * * *', 0],
  ['ORDER_STATUS_ILLEGAL_TRANSITION', 'order', '订单状态疑似非法流转', '订单状态与支付/发货状态组合不合法。', 'P1', '*/30 * * * *', 0],
  ['ORDER_SHIPPED_WITHOUT_TRACKING', 'order', '已发货订单缺少物流信息', '订单已发货但缺少物流单号或承运商。', 'P2', '0 * * * *', 0],
  ['ORDER_CANCELLED_BUT_PAYMENT_PAID', 'order', '订单已取消但支付仍成功', '订单取消后支付状态仍为已支付。', 'P0', '*/15 * * * *', 0],

  ['RETURN_REQUEST_TIMEOUT', 'refund', '售后申请超时未处理', '售后申请超过 SLA 未处理。', 'P1', '*/30 * * * *', 0],
  ['REFUND_PENDING_TOO_LONG', 'refund', '退款长时间待处理', '退款单超过 SLA 仍未完成。', 'P1', '*/30 * * * *', 0],
  ['REFUND_SUCCESS_ORDER_STATUS_MISMATCH', 'refund', '退款成功但订单状态不一致', '退款成功后订单退款状态未同步。', 'P1', '*/30 * * * *', 0],
  ['RETURN_APPROVED_BUT_NO_REFUND', 'refund', '售后已同意但未退款', '售后同意后缺少退款记录。', 'P1', '*/30 * * * *', 0],

  ['COUPON_STOCK_NEGATIVE', 'coupon', '优惠券库存为负', '优惠券库存或剩余数量小于 0。', 'P1', '*/30 * * * *', 0],
  ['COUPON_CLAIMED_BUT_NO_RECORD', 'coupon', '优惠券领取缺少记录', '领取计数与领取记录不一致。', 'P2', '0 * * * *', 0],
  ['COUPON_USED_BUT_ORDER_UNPAID', 'coupon', '未支付订单使用优惠券', '优惠券已核销但关联订单未支付。', 'P1', '*/30 * * * *', 0],
  ['COUPON_EXPIRED_BUT_AVAILABLE', 'coupon', '过期优惠券仍可用', '已过期优惠券仍处于可用状态。', 'P2', '0 * * * *', 0],

  ['MEMBER_LEVEL_MISMATCH', 'loyalty', '会员等级不匹配', '用户消费/积分与会员等级不一致。', 'P2', '0 * * * *', 0],
  ['POINTS_EXPIRED_JOB_FAILED', 'loyalty', '积分过期任务失败', '积分过期调度近期失败或未运行。', 'P1', '0 * * * *', 0],
  ['POINTS_USED_BUT_ORDER_CANCELLED', 'loyalty', '取消订单积分未回滚', '订单取消后使用积分未回滚。', 'P1', '*/30 * * * *', 0],
  ['BIRTHDAY_GIFT_DUPLICATE', 'loyalty', '生日礼重复发放', '同一用户周期内重复领取生日礼。', 'P2', '0 * * * *', 0],

  ['REFERRAL_REWARD_PENDING_TOO_LONG', 'referral', '邀请奖励长时间待结算', '邀请/返佣奖励超过 SLA 仍未结算。', 'P2', '0 * * * *', 0],
  ['INVITE_RELATION_DUPLICATE', 'referral', '邀请关系重复', '同一用户存在重复邀请关系。', 'P1', '0 * * * *', 0],
  ['REFERRAL_REWARD_AMOUNT_MISMATCH', 'referral', '返佣金额不一致', '返佣金额与规则计算结果不一致。', 'P1', '0 * * * *', 0],

  ['NOTIFICATION_BATCH_FAILED', 'notification', '通知批次失败', '通知批次发送失败。', 'P2', '*/30 * * * *', 0],
  ['TELEGRAM_NOTIFY_FAILED', 'notification', 'Telegram 通知失败', 'Telegram 通知近期发送失败。', 'P1', '*/15 * * * *', 0],
  ['SMS_SEND_FAILED', 'notification', '短信发送失败', '短信发送近期失败。', 'P2', '*/30 * * * *', 0],
  ['NOTIFICATION_RECIPIENT_STUCK', 'notification', '通知收件人卡住', '通知收件人长时间停留在待发送/发送中状态。', 'P2', '*/30 * * * *', 0],

  ['MYINVOIS_SUBMIT_FAILED', 'myinvois', 'MyInvois 提交失败', 'MyInvois 文档提交失败。', 'P1', '*/30 * * * *', 0],
  ['MYINVOIS_RETRY_STUCK', 'myinvois', 'MyInvois 重试卡住', 'MyInvois 重试任务长时间未推进。', 'P2', '*/30 * * * *', 0],
  ['MYINVOIS_DOCUMENT_STATUS_MISMATCH', 'myinvois', 'MyInvois 文档状态不一致', '本地文档状态与 MyInvois 状态不一致。', 'P1', '*/30 * * * *', 0],
];

module.exports = {
  async up(query) {
    await addColumn(query, 'admin_event_records', 'assignee_id', 'assignee_id VARCHAR(36) DEFAULT NULL');
    await addColumn(query, 'admin_event_records', 'due_at', 'due_at DATETIME DEFAULT NULL');
    await addColumn(query, 'admin_event_records', 'priority', "priority VARCHAR(16) NOT NULL DEFAULT 'normal'");
    await addColumn(query, 'admin_event_records', 'closed_reason', 'closed_reason VARCHAR(255) DEFAULT NULL');

    await addColumn(query, 'data_consistency_anomalies', 'assignee_id', 'assignee_id VARCHAR(36) DEFAULT NULL');
    await addColumn(query, 'data_repair_tasks', 'approval_status', "approval_status VARCHAR(32) NOT NULL DEFAULT 'pending'");
    await addColumn(query, 'data_repair_tasks', 'approved_by', 'approved_by VARCHAR(36) DEFAULT NULL');
    await addColumn(query, 'data_repair_tasks', 'approved_at', 'approved_at DATETIME DEFAULT NULL');
    await addColumn(query, 'data_repair_tasks', 'approval_source', "approval_source VARCHAR(40) NOT NULL DEFAULT 'manual'");
    await addColumn(query, 'data_repair_tasks', 'approval_remark', 'approval_remark VARCHAR(1000) DEFAULT NULL');
    await addColumn(query, 'data_repair_tasks', 'execution_log', 'execution_log JSON NULL');
    await addColumn(query, 'data_repair_tasks', 'rollback_suggestion', 'rollback_suggestion JSON NULL');

    await query('CREATE INDEX idx_admin_event_assignee_due ON admin_event_records (assignee_id, due_at)').catch(() => {});
    await query('CREATE INDEX idx_dca_assignee_status ON data_consistency_anomalies (assignee_id, status)').catch(() => {});
    await query('CREATE INDEX idx_drt_approval_status ON data_repair_tasks (approval_status, repair_status)').catch(() => {});

    for (const row of SECURITY_EVENT_RULES) await seedAdminEventRule(query, row);
    for (const row of MONITORING_RULES) await seedMonitoringRule(query, row);
  },
};
