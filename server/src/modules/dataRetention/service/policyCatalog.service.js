const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 1000;
const MIN_BATCH_SIZE = 500;
const MAX_BATCH_SIZE = 2000;

const PROTECTED_TABLE_RULES = [
  { type: 'exact', value: 'orders' },
  { type: 'exact', value: 'order_items' },
  { type: 'exact', value: 'inventory_stock_records' },
  { type: 'exact', value: 'points_records' },
  { type: 'prefix', value: 'payment_' },
  { type: 'prefix', value: 'myinvois_' },
  { type: 'prefix', value: 'reward_' },
];

function quoteIdentifier(identifier) {
  const value = String(identifier || '');
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error(`Unsafe identifier: ${value}`);
  }
  return `\`${value}\``;
}

function cutoffDate(retentionDays, now = Date.now()) {
  return new Date(now - Number(retentionDays || 0) * DAY_MS);
}

function beforeColumn(column, extraSql = '', extraParams = []) {
  return ({ cutoffAt }) => ({
    sql: `${quoteIdentifier(column)} < ?${extraSql ? ` AND (${extraSql})` : ''}`,
    params: [cutoffAt, ...extraParams],
  });
}

function rawWhere(sql, params = []) {
  return ({ cutoffAt }) => ({
    sql,
    params: params.map((param) => (param === '$cutoffAt' ? cutoffAt : param)),
  });
}

function isProtectedTable(tableName) {
  const value = String(tableName || '').toLowerCase();
  return PROTECTED_TABLE_RULES.some((rule) => {
    if (rule.type === 'exact') return value === rule.value;
    return value.startsWith(rule.value);
  });
}

const DEFAULT_POLICY_DEFINITIONS = [
  {
    key: 'otp_send_logs',
    title: '验证码发送日志',
    category: 'auth',
    tableName: 'otp_send_logs',
    dateColumn: 'created_at',
    retentionDays: 7,
    description: '清理过期的一次性验证码发送记录。',
    where: beforeColumn('created_at'),
  },
  {
    key: 'password_reset_tokens',
    title: '密码重置令牌',
    category: 'auth',
    tableName: 'password_reset_tokens',
    dateColumn: 'created_at',
    retentionDays: 7,
    description: '清理已过保留期的密码重置令牌。',
    where: beforeColumn('created_at'),
  },
  {
    key: 'oauth_states',
    title: '第三方登录状态',
    category: 'auth',
    tableName: 'oauth_states',
    dateColumn: 'created_at',
    retentionDays: 7,
    description: '清理第三方登录过程中的临时状态与防重放记录。',
    where: beforeColumn('created_at'),
  },
  {
    key: 'pending_wechat_login',
    title: '微信登录临时态',
    category: 'auth',
    tableName: 'pending_wechat_login',
    dateColumn: 'created_at',
    retentionDays: 7,
    description: '清理微信登录绑定过程中的临时记录。',
    where: beforeColumn('created_at'),
  },
  {
    key: 'auth_login_tickets',
    title: '登录票据',
    category: 'auth',
    tableName: 'auth_login_tickets',
    dateColumn: 'created_at',
    retentionDays: 7,
    description: '清理社交与第三方登录一次性票据。',
    where: beforeColumn('created_at'),
  },
  {
    key: 'admin_trusted_devices',
    title: '管理员可信设备',
    category: 'security',
    tableName: 'admin_trusted_devices',
    dateColumn: 'expires_at',
    retentionDays: 90,
    description: '仅清理已过期或已撤销且超过保留期的管理员可信设备。',
    where: ({ cutoffAt }) => ({
      sql: '(expires_at < NOW() OR revoked_at IS NOT NULL) AND COALESCE(revoked_at, expires_at, last_seen_at, first_seen_at) < ?',
      params: [cutoffAt],
    }),
  },
  {
    key: 'admin_sensitive_action_tokens',
    title: '敏感操作令牌',
    category: 'security',
    tableName: 'admin_sensitive_action_tokens',
    dateColumn: 'expires_at',
    retentionDays: 7,
    description: '清理已过期或已撤销的管理员敏感操作二次验证令牌。',
    where: ({ cutoffAt }) => ({
      sql: '(expires_at < NOW() OR revoked_at IS NOT NULL) AND COALESCE(revoked_at, expires_at, last_used_at, created_at) < ?',
      params: [cutoffAt],
    }),
  },
  {
    key: 'cart_items',
    title: '购物车明细',
    category: 'commerce',
    tableName: 'cart_items',
    dateColumn: 'updated_at',
    retentionDays: 90,
    description: '清理长期未更新的购物车明细。',
    where: beforeColumn('updated_at'),
  },
  {
    key: 'checkout_abandonments',
    title: '未完成结账快照',
    category: 'commerce',
    tableName: 'checkout_abandonments',
    dateColumn: 'updated_at',
    retentionDays: 90,
    description: '清理长期未更新的结账放弃快照。',
    where: beforeColumn('updated_at'),
  },
  {
    key: 'browsing_history',
    title: '浏览历史',
    category: 'user',
    tableName: 'browsing_history',
    dateColumn: 'viewed_at',
    retentionDays: 180,
    description: '清理用户浏览历史。',
    where: beforeColumn('viewed_at'),
  },
  {
    key: 'analytics_events',
    title: '分析埋点事件',
    category: 'analytics',
    tableName: 'analytics_events',
    dateColumn: 'created_at',
    retentionDays: 365,
    description: '清理原始分析埋点；后续可在聚合后删除。',
    where: beforeColumn('created_at'),
  },
  {
    key: 'home_engagement_events',
    title: '首页互动事件',
    category: 'analytics',
    tableName: 'home_engagement_events',
    dateColumn: 'created_at',
    retentionDays: 180,
    description: '清理首页运营互动事件。',
    where: beforeColumn('created_at'),
  },
  {
    key: 'notifications_read',
    title: '已读站内通知',
    category: 'notification',
    tableName: 'notifications',
    dateColumn: 'created_at',
    retentionDays: 365,
    description: '仅清理已读且超过保留期的站内通知。',
    where: ({ cutoffAt }) => ({
      sql: 'is_read = 1 AND COALESCE(sent_at, created_at) < ?',
      params: [cutoffAt],
    }),
  },
  {
    key: 'notification_logs',
    title: '通知发送日志',
    category: 'notification',
    tableName: 'notification_logs',
    dateColumn: 'created_at',
    retentionDays: 180,
    description: '清理通知发送流水日志。',
    where: beforeColumn('created_at'),
  },
  {
    key: 'notification_batches',
    title: '通知批次',
    category: 'notification',
    tableName: 'notification_batches',
    dateColumn: 'created_at',
    retentionDays: 365,
    description: '清理超过保留期且非定时中的通知批次。',
    where: beforeColumn('created_at', "send_status <> 'scheduled'"),
  },
  {
    key: 'export_tasks',
    title: '导出任务记录',
    category: 'export',
    tableName: 'export_tasks',
    dateColumn: 'created_at',
    retentionDays: 30,
    description: '清理过期导出任务记录。',
    where: beforeColumn('created_at'),
  },
  {
    key: 'export_files',
    title: '导出文件',
    category: 'export',
    tableName: 'export_files',
    dateColumn: 'mtime',
    deleteMode: 'file_delete',
    retentionDays: 7,
    description: '清理服务器本地导出目录中的过期文件。',
  },
  {
    key: 'user_login_audits',
    title: '用户登录审计',
    category: 'security',
    tableName: 'user_login_audits',
    dateColumn: 'created_at',
    retentionDays: 365,
    description: '清理普通用户登录审计记录。',
    where: beforeColumn('created_at'),
  },
  {
    key: 'audit_logs',
    title: '审计日志',
    category: 'security',
    tableName: 'audit_logs',
    dateColumn: 'created_at',
    retentionDays: 2555,
    minRetentionDays: 2555,
    locked: true,
    description: '正式审计日志默认保留 7 年，策略锁定且不允许降低保留期。',
    where: beforeColumn('created_at'),
  },
  {
    key: 'admin_event_records_resolved',
    title: '已解决后台事件',
    category: 'monitoring',
    tableName: 'admin_event_records',
    dateColumn: 'resolved_at',
    retentionDays: 365,
    description: '仅清理已解决、已忽略或已过期的后台事件记录。',
    where: ({ cutoffAt }) => ({
      sql: "status IN ('resolved','ignored','auto_resolved','expired') AND COALESCE(resolved_at, expired_at, updated_at, created_at) < ?",
      params: [cutoffAt],
    }),
  },
  {
    key: 'data_consistency_runs',
    title: '一致性检测运行记录',
    category: 'monitoring',
    tableName: 'data_consistency_runs',
    dateColumn: 'started_at',
    retentionDays: 180,
    description: '清理数据一致性检测历史运行记录。',
    where: beforeColumn('started_at'),
  },
  {
    key: 'data_consistency_rule_events',
    title: '一致性规则事件',
    category: 'monitoring',
    tableName: 'data_consistency_rule_events',
    dateColumn: 'created_at',
    retentionDays: 180,
    description: '清理数据一致性规则事件流水。',
    where: beforeColumn('created_at'),
  },
  {
    key: 'data_change_events',
    title: '数据变更事件',
    category: 'monitoring',
    tableName: 'data_change_events',
    dateColumn: 'created_at',
    retentionDays: 180,
    description: '清理数据一致性监控产生的变更追踪事件流水。',
    where: beforeColumn('created_at'),
  },
  {
    key: 'data_consistency_anomalies_resolved',
    title: '已解决一致性异常',
    category: 'monitoring',
    tableName: 'data_consistency_anomalies',
    dateColumn: 'resolved_at',
    retentionDays: 365,
    description: '仅清理已解决、已忽略或已修复的一致性异常。',
    where: ({ cutoffAt }) => ({
      sql: "status IN ('resolved','ignored','repaired') AND COALESCE(resolved_at, updated_at, last_seen_at, created_at) < ?",
      params: [cutoffAt],
    }),
  },
  {
    key: 'data_repair_tasks',
    title: '数据修复任务',
    category: 'monitoring',
    tableName: 'data_repair_tasks',
    dateColumn: 'created_at',
    retentionDays: 365,
    description: '清理历史数据修复任务。',
    where: beforeColumn('created_at'),
  },
  {
    key: 'data_cleanup_runs_preview',
    title: '清理预览记录',
    category: 'system',
    tableName: 'data_cleanup_runs',
    dateColumn: 'started_at',
    retentionDays: 90,
    description: '清理 90 天前的数据清理预览记录。',
    where: rawWhere("run_type = 'preview' AND started_at < ?", ['$cutoffAt']),
  },
  {
    key: 'data_cleanup_run_steps_history',
    title: '清理步骤历史',
    category: 'system',
    tableName: 'data_cleanup_run_steps',
    dateColumn: 'started_at',
    retentionDays: 365,
    description: '跟随旧的非运行清理任务清理步骤记录。',
    where: rawWhere(
      `started_at < ? AND (
        run_id NOT IN (SELECT id FROM data_cleanup_runs)
        OR run_id IN (
          SELECT id FROM data_cleanup_runs
          WHERE status <> 'running' AND started_at < ?
        )
      )`,
      ['$cutoffAt', '$cutoffAt'],
    ),
  },
  {
    key: 'data_cleanup_file_candidates_history',
    title: '文件清理候选历史',
    category: 'system',
    tableName: 'data_cleanup_file_candidates',
    dateColumn: 'created_at',
    retentionDays: 365,
    description: '清理旧的文件清理预览候选记录。',
    where: rawWhere(
      `created_at < ? AND (
        preview_run_id NOT IN (SELECT id FROM data_cleanup_runs)
        OR preview_run_id IN (
          SELECT id FROM data_cleanup_runs
          WHERE status <> 'running' AND started_at < ?
        )
      )`,
      ['$cutoffAt', '$cutoffAt'],
    ),
  },
  {
    key: 'data_cleanup_runs_history',
    title: '清理执行历史',
    category: 'system',
    tableName: 'data_cleanup_runs',
    dateColumn: 'started_at',
    retentionDays: 365,
    description: '清理 365 天前非运行状态的数据清理执行记录。',
    where: rawWhere("run_type <> 'preview' AND status <> 'running' AND started_at < ?", ['$cutoffAt']),
  },
  {
    key: 'backup_alerts_resolved',
    title: '已解决备份告警',
    category: 'backup',
    tableName: 'backup_alerts',
    dateColumn: 'resolved_at',
    retentionDays: 365,
    description: '清理 365 天前已解决的备份告警。',
    where: rawWhere("status = 'resolved' AND COALESCE(resolved_at, created_at) < ?", ['$cutoffAt']),
  },
  {
    key: 'backup_jobs_history',
    title: '备份任务历史',
    category: 'backup',
    tableName: 'backup_jobs',
    dateColumn: 'finished_at',
    retentionDays: 1095,
    description: '清理 3 年前已结束的备份任务元数据；不按文件路径删除备份对象。',
    where: rawWhere("status IN ('success','failed','cancelled') AND COALESCE(finished_at, created_at) < ?", ['$cutoffAt']),
  },
  {
    key: 'restore_jobs_history',
    title: '恢复任务历史',
    category: 'backup',
    tableName: 'restore_jobs',
    dateColumn: 'finished_at',
    retentionDays: 1095,
    description: '清理 3 年前已结束的恢复任务元数据。',
    where: rawWhere("status IN ('merged','switched','failed','cancelled') AND COALESCE(finished_at, created_at) < ?", ['$cutoffAt']),
  },
  {
    key: 'restore_drill_reports_history',
    title: '恢复演练报告历史',
    category: 'backup',
    tableName: 'restore_drill_reports',
    dateColumn: 'created_at',
    retentionDays: 365,
    description: '清理 365 天前的恢复演练报告。',
    where: rawWhere('COALESCE(finished_at, created_at) < ?', ['$cutoffAt']),
  },
  {
    key: 'binlog_files_history',
    title: 'Binlog 文件元数据历史',
    category: 'backup',
    tableName: 'binlog_files',
    dateColumn: 'uploaded_at',
    retentionDays: 1095,
    description: '清理 3 年前的 binlog 文件元数据，保留近期时间点恢复索引。',
    where: beforeColumn('uploaded_at'),
  },
  {
    key: 'search_terms_inactive',
    title: '低频搜索词',
    category: 'analytics',
    tableName: 'search_terms',
    dateColumn: 'last_searched_at',
    retentionDays: 365,
    description: '清理 365 天未搜索且搜索次数较低的关键词。',
    where: rawWhere('search_count <= 2 AND COALESCE(last_searched_at, updated_at, created_at) < ?', ['$cutoffAt']),
  },
  {
    key: 'coupon_events_history',
    title: '优惠券事件流水',
    category: 'commerce',
    tableName: 'coupon_events',
    dateColumn: 'created_at',
    retentionDays: 730,
    description: '清理 730 天前的优惠券事件流水。',
    where: beforeColumn('created_at'),
  },
  {
    key: 'cache_meta_expired',
    title: '失效缓存元数据',
    category: 'monitoring',
    tableName: 'cache_meta',
    dateColumn: 'updated_at',
    retentionDays: 90,
    description: '清理长期未更新且已不再有效的缓存元数据。',
    where: rawWhere('db_updated_at IS NOT NULL AND cache_updated_at < db_updated_at AND updated_at < ?', ['$cutoffAt']),
  },
  {
    key: 'admin_event_actions_history',
    title: '后台事件操作历史',
    category: 'monitoring',
    tableName: 'admin_event_actions',
    dateColumn: 'created_at',
    retentionDays: 365,
    description: '清理已解决或已清理后台事件关联的操作历史。',
    where: rawWhere(
      `created_at < ? AND (
        event_id NOT IN (SELECT id FROM admin_event_records)
        OR event_id IN (
          SELECT id FROM admin_event_records
          WHERE status IN ('resolved','ignored','auto_resolved','expired')
            AND COALESCE(resolved_at, expired_at, updated_at, created_at) < ?
        )
      )`,
      ['$cutoffAt', '$cutoffAt'],
    ),
  },
  {
    key: 'admin_event_user_states_history',
    title: '后台事件用户状态历史',
    category: 'monitoring',
    tableName: 'admin_event_user_states',
    dateColumn: 'updated_at',
    retentionDays: 365,
    description: '清理已解决或已清理后台事件关联的用户阅读状态。',
    where: rawWhere(
      `updated_at < ? AND (
        event_id NOT IN (SELECT id FROM admin_event_records)
        OR event_id IN (
          SELECT id FROM admin_event_records
          WHERE status IN ('resolved','ignored','auto_resolved','expired')
            AND COALESCE(resolved_at, expired_at, updated_at, created_at) < ?
        )
      )`,
      ['$cutoffAt', '$cutoffAt'],
    ),
  },
  {
    key: 'raw_upload_objects',
    title: 'S3 原始临时上传对象',
    category: 'file',
    tableName: 's3:uploads/raw',
    dateColumn: 'last_modified',
    deleteMode: 'file_delete',
    retentionDays: 1,
    description: '清理 S3 uploads/raw/ 下超过 24 小时未完成的临时对象。',
  },
  {
    key: 'orphan_upload_files_preview',
    title: '孤儿上传文件预览',
    category: 'file',
    tableName: 'uploads',
    dateColumn: 'last_modified',
    deleteMode: 'file_delete',
    retentionDays: 30,
    enabled: false,
    description: '扫描本地和 S3 上传目录，预览超过 30 天未被业务引用的文件。',
  },
  {
    key: 'orphan_upload_files_run',
    title: '孤儿上传文件执行',
    category: 'file',
    tableName: 'uploads',
    dateColumn: 'last_modified',
    deleteMode: 'file_delete',
    retentionDays: 30,
    enabled: false,
    description: '只删除已预览确认且仍未过期的孤儿上传文件。',
  },
].map((policy) => ({
  batchSize: DEFAULT_BATCH_SIZE,
  enabled: true,
  deleteMode: 'hard_delete',
  minRetentionDays: 1,
  locked: false,
  idColumn: 'id',
  ...policy,
}));

const POLICY_BY_KEY = new Map(DEFAULT_POLICY_DEFINITIONS.map((policy) => [policy.key, policy]));

function getPolicyDefinition(key) {
  return POLICY_BY_KEY.get(String(key || '')) || null;
}

function listPolicyDefinitions() {
  return [...DEFAULT_POLICY_DEFINITIONS];
}

function normalizeBatchSize(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < MIN_BATCH_SIZE || n > MAX_BATCH_SIZE) return null;
  return n;
}

function buildPolicyRuntime(row, now = Date.now()) {
  const definition = getPolicyDefinition(row?.policy_key || row?.key);
  if (!definition) return null;
  const retentionDays = Number(row?.retention_days ?? definition.retentionDays);
  const batchSize = Number(row?.batch_size ?? definition.batchSize);
  const cutoffAt = cutoffDate(retentionDays, now);
  return {
    ...definition,
    policyKey: definition.key,
    retentionDays,
    defaultRetentionDays: Number(row?.default_retention_days ?? definition.retentionDays),
    minRetentionDays: Number(row?.min_retention_days ?? definition.minRetentionDays ?? 1),
    batchSize: normalizeBatchSize(batchSize) || definition.batchSize,
    enabled: row?.enabled === undefined ? Boolean(definition.enabled) : Boolean(row.enabled),
    locked: row?.locked === undefined ? Boolean(definition.locked) : Boolean(row.locked),
    cutoffAt,
    row,
  };
}

function assertCatalogIsSafe() {
  for (const policy of DEFAULT_POLICY_DEFINITIONS) {
    if (policy.deleteMode === 'file_delete') continue;
    if (isProtectedTable(policy.tableName)) {
      throw new Error(`Protected table cannot be registered for cleanup: ${policy.tableName}`);
    }
  }
}

module.exports = {
  DEFAULT_BATCH_SIZE,
  MIN_BATCH_SIZE,
  MAX_BATCH_SIZE,
  PROTECTED_TABLE_RULES,
  assertCatalogIsSafe,
  buildPolicyRuntime,
  cutoffDate,
  getPolicyDefinition,
  isProtectedTable,
  listPolicyDefinitions,
  normalizeBatchSize,
  quoteIdentifier,
};
