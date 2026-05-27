/** 清理执行类型 */
export const DATA_CLEANUP_RUN_TYPE_LABELS: Record<string, string> = {
  preview: "清理预览",
  manual: "手动执行",
  scheduled: "定时执行",
};

/** 策略分类（与 policyCatalog category 一致） */
export const DATA_CLEANUP_CATEGORY_LABELS: Record<string, string> = {
  auth: "认证与会话",
  security: "安全与审计",
  commerce: "交易与营销",
  user: "用户行为",
  analytics: "统计与分析",
  notification: "通知与消息",
  export: "导出任务",
  monitoring: "监控与一致性",
  system: "系统维护",
};

/** 清理策略名称（与 policyCatalog key 一致，界面优先展示） */
export const DATA_CLEANUP_POLICY_LABELS: Record<string, string> = {
  otp_send_logs: "验证码发送日志",
  password_reset_tokens: "密码重置令牌",
  oauth_states: "第三方登录状态",
  pending_wechat_login: "微信登录临时记录",
  auth_login_tickets: "登录票据",
  admin_trusted_devices: "管理员可信设备",
  admin_sensitive_action_tokens: "敏感操作令牌",
  cart_items: "购物车明细",
  checkout_abandonments: "未完成结账快照",
  browsing_history: "浏览历史",
  analytics_events: "分析埋点事件",
  home_engagement_events: "首页互动事件",
  notifications_read: "已读站内通知",
  notification_logs: "通知发送日志",
  notification_batches: "通知批次",
  export_tasks: "导出任务记录",
  export_files: "导出文件",
  user_login_audits: "用户登录审计",
  audit_logs: "审计日志",
  admin_event_records_resolved: "已解决后台事件",
  data_consistency_runs: "一致性检测运行记录",
  data_consistency_rule_events: "一致性规则事件",
  data_change_events: "数据变更事件",
  data_consistency_anomalies_resolved: "已解决一致性异常",
  data_repair_tasks: "数据修复任务",
};

/** 清理策略对应的数据表（与 policyCatalog tableName 一致） */
export const DATA_CLEANUP_TABLE_LABELS: Record<string, string> = {
  otp_send_logs: "验证码发送日志",
  password_reset_tokens: "密码重置令牌",
  oauth_states: "第三方登录状态",
  pending_wechat_login: "微信登录临时记录",
  auth_login_tickets: "登录票据",
  admin_trusted_devices: "管理员可信设备",
  admin_sensitive_action_tokens: "敏感操作令牌",
  cart_items: "购物车明细",
  checkout_abandonments: "未完成结账快照",
  browsing_history: "浏览历史",
  analytics_events: "分析埋点事件",
  home_engagement_events: "首页互动事件",
  notifications: "站内通知",
  notification_logs: "通知发送日志",
  notification_batches: "通知批次",
  export_tasks: "导出任务记录",
  export_files: "导出文件目录",
  user_login_audits: "用户登录审计",
  audit_logs: "审计日志",
  admin_event_records: "后台事件记录",
  data_consistency_runs: "一致性检测运行记录",
  data_consistency_rule_events: "一致性规则事件",
  data_change_events: "数据变更事件",
  data_consistency_anomalies: "一致性异常记录",
  data_repair_tasks: "数据修复任务",
};

/** 默认保护表（overview API 返回的 pattern） */
export const DATA_CLEANUP_PROTECTED_TABLE_LABELS: Record<string, string> = {
  orders: "订单主表",
  order_items: "订单明细",
  "payment_*": "支付相关表",
  "myinvois_*": "电子发票相关表",
  inventory_stock_records: "库存流水",
  points_records: "积分流水",
  "reward_*": "返现/奖励相关表",
};

export function formatDataCleanupRunType(runType?: string | null): string {
  if (!runType) return "-";
  return DATA_CLEANUP_RUN_TYPE_LABELS[runType] || runType;
}

export function formatDataCleanupCategory(category?: string | null): string {
  if (!category) return "系统维护";
  return DATA_CLEANUP_CATEGORY_LABELS[category] || category;
}

export function formatDataCleanupProtectedTable(table?: string | null): string {
  if (!table) return "-";
  return DATA_CLEANUP_PROTECTED_TABLE_LABELS[table] || table;
}

/** 界面展示用：不回落为 snake_case 英文表名 */
export function formatDataCleanupTableName(
  table?: string | null,
  policyKey?: string | null,
): string {
  const tableKey = String(table || "").trim();
  if (tableKey && DATA_CLEANUP_TABLE_LABELS[tableKey]) {
    return DATA_CLEANUP_TABLE_LABELS[tableKey];
  }
  const key = String(policyKey || "").trim();
  if (key && DATA_CLEANUP_POLICY_LABELS[key]) {
    return DATA_CLEANUP_POLICY_LABELS[key];
  }
  return "系统数据";
}

export function formatDataCleanupPolicyTitle(
  policy?: { key?: string; title?: string | null } | null,
): string {
  const key = String(policy?.key || "").trim();
  if (key && DATA_CLEANUP_POLICY_LABELS[key]) {
    return DATA_CLEANUP_POLICY_LABELS[key];
  }
  const title = String(policy?.title || "").trim();
  if (title && !/^[a-z][a-z0-9_]*$/i.test(title)) {
    return title;
  }
  return title || "未命名策略";
}

export function formatDataCleanupPolicyKey(
  policyKey?: string | null,
  policyTitleByKey?: Record<string, string>,
): string {
  const key = String(policyKey || "").trim();
  if (!key) return "-";
  if (DATA_CLEANUP_POLICY_LABELS[key]) return DATA_CLEANUP_POLICY_LABELS[key];
  const title = policyTitleByKey?.[key]?.trim();
  if (title && !/^[a-z][a-z0-9_]*$/i.test(title)) return title;
  return formatDataCleanupTableName(undefined, key);
}
