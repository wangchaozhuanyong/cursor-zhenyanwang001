export const BACKUP_FILE_KIND_LABELS: Record<string, string> = {
  mysql_full: "数据库全量备份",
  mysql_binlog: "数据库增量日志",
  config: "系统配置备份",
  uploads: "上传文件备份",
  report: "报表数据备份",
};

export const BACKUP_JOB_TYPE_LABELS: Record<string, string> = {
  full: "全量备份",
  long_term_full: "长期全量备份",
  pre_deploy: "部署前备份",
  pre_migration: "迁移前备份",
  pre_cleanup: "清理前备份",
  config: "配置备份",
  uploads: "文件备份",
  binlog_sync: "增量日志同步",
  restore_drill: "恢复演练",
};

export const BACKUP_STATUS_LABELS: Record<string, string> = {
  success: "成功",
  running: "运行中",
  queued: "排队中",
  failed: "失败",
  cancelled: "已取消",
  open: "待处理",
  acknowledged: "已确认",
  resolved: "已完成",
  validated: "已校验",
  temp_restored: "已恢复到临时库",
  awaiting_approval: "待审批",
  approved: "已批准",
  merged: "已合并",
  switched: "已切换",
};

export const BACKUP_STORAGE_PROVIDER_LABELS: Record<string, string> = {
  s3: "云端对象存储",
  local: "本地存储",
  minio: "对象存储",
};

export const RESTORE_TYPE_LABELS: Record<string, string> = {
  site: "数据库整库恢复",
  point_in_time: "指定时间点恢复",
  table: "单表恢复",
  order: "单订单恢复",
  user: "单用户恢复",
  pre_deploy_rollback: "部署前版本回滚",
};

export const BACKUP_ALERT_TYPE_LABELS: Record<string, string> = {
  full_failed: "数据库全量备份失败",
  binlog_upload_failed: "数据库增量日志上传失败",
  s3_upload_failed: "云端上传失败",
  verify_failed: "备份校验失败",
  stale_backup: "备份过期",
  restore_drill_failed: "自动恢复演练失败",
  disk_low: "磁盘空间不足",
  restore_failed: "恢复到临时库失败",
};

const BACKUP_ALERT_TITLE_ZH: Record<string, string> = {
  "MySQL binlog upload failed": "数据库增量日志上传失败",
  "MySQL full backup failed": "数据库全量备份失败",
  "Automatic restore drill failed": "自动恢复演练失败",
  "Restore validation failed": "恢复校验失败",
  "Restore to temporary database failed": "恢复到临时库失败",
};

const BACKUP_ALERT_MESSAGE_PATTERNS: Array<[RegExp, string]> = [
  [/MYSQL_BINLOG_DIR is required/i, "未配置 MySQL 增量日志目录，请在环境变量中设置 MYSQL_BINLOG_DIR。"],
  [/binlog.*upload.*fail/i, "增量日志上传到云端失败，请检查对象存储与网络配置。"],
  [/S3|s3|bucket/i, "对象存储上传异常，请检查存储桶权限与密钥。"],
  [/ECONNREFUSED|ENOTFOUND/i, "无法连接数据库或存储服务，请检查网络与服务状态。"],
  [/EACCES.*permission denied.*(?:scandir|readdir|read|access).*mysql/i, "无权限访问 MySQL 数据目录，请检查运行账号对数据库目录的读取权限。"],
  [/EACCES.*permission denied/i, "文件或目录权限不足，请检查服务运行账号权限。"],
  [/ENOSPC.*no space left/i, "磁盘空间已满，无法继续写入备份文件，请尽快清理磁盘。"],
  [/low disk space/i, "磁盘可用空间低于备份安全阈值，请清理磁盘或调整备份目录。"],
  [/ENOENT.*no such file or directory/i, "找不到指定文件或目录，请检查路径配置是否正确。"],
  [/ETIMEDOUT|ECONNRESET/i, "网络连接超时或被重置，请检查网络与服务状态。"],
  [/EPERM.*operation not permitted/i, "操作被拒绝，请检查系统权限与安全策略。"],
  [/No successful full backup|No full backup/i, "没有可用的成功全量备份，无法执行恢复演练。"],
];

export function formatBackupFileKind(kind?: string | null): string {
  const key = String(kind || "").trim();
  if (!key) return "-";
  return BACKUP_FILE_KIND_LABELS[key] || "备份文件";
}

export function formatBackupJobType(type?: string | null): string {
  const key = String(type || "").trim();
  if (!key) return "-";
  return BACKUP_JOB_TYPE_LABELS[key] || formatBackupFileKind(key);
}

export function formatBackupStatus(status?: string | null): string {
  const key = String(status || "").trim();
  if (!key) return "-";
  return BACKUP_STATUS_LABELS[key] || "未知状态";
}

export function formatBackupStorageProvider(provider?: string | null): string {
  const key = String(provider || "").trim().toLowerCase();
  if (!key) return "存储";
  return BACKUP_STORAGE_PROVIDER_LABELS[key] || "外部存储";
}

export function formatBackupStorageLocation(file: {
  storage_provider?: string | null;
  bucket?: string | null;
  storage_key?: string | null;
}): { label: string; title?: string } {
  const provider = formatBackupStorageProvider(file.storage_provider);
  const bucket = String(file.bucket || "").trim();
  const key = String(file.storage_key || "").trim();
  const fullPath = [file.storage_provider, bucket, key].filter(Boolean).join(" / ");

  if (String(file.storage_provider || "").toLowerCase() === "local" || !bucket) {
    return { label: provider, title: key || undefined };
  }

  const shortBucket = bucket.length > 24 ? `${bucket.slice(0, 10)}...${bucket.slice(-8)}` : bucket;
  return { label: `${provider}：${shortBucket}`, title: fullPath || undefined };
}

export function formatRestoreType(type?: string | null): string {
  const key = String(type || "").trim();
  if (!key) return "-";
  return RESTORE_TYPE_LABELS[key] || "恢复任务";
}

export function formatBackupAlertType(type?: string | null): string {
  const key = String(type || "").trim();
  if (!key) return "";
  return BACKUP_ALERT_TYPE_LABELS[key] || "";
}

export function formatBackupAlertTitle(title?: string | null, alertType?: string | null): string {
  const raw = String(title || "").trim();
  if (raw && BACKUP_ALERT_TITLE_ZH[raw]) return BACKUP_ALERT_TITLE_ZH[raw];
  if (raw && /[\u4e00-\u9fff]/.test(raw)) return raw;
  const fromType = formatBackupAlertType(alertType);
  if (fromType) return fromType;
  return raw || "备份告警";
}

export function formatBackupAlertMessage(message?: string | null, alertType?: string | null): string {
  const raw = String(message || "").trim();
  if (raw && /[\u4e00-\u9fff]/.test(raw)) return raw;
  for (const [pattern, zh] of BACKUP_ALERT_MESSAGE_PATTERNS) {
    if (pattern.test(raw)) return zh;
  }
  const fromType = formatBackupAlertType(alertType);
  if (fromType && !raw) return `请检查${fromType}相关配置与日志。`;
  if (!raw) return "请查看服务器备份日志获取详情。";
  return "备份任务出现异常，请查看服务器日志。";
}

export function formatRestoreTempDatabase(name?: string | null): string {
  const value = String(name || "").trim();
  if (!value) return "-";
  if (/^restore[_-]/i.test(value) || /^tmp[_-]/i.test(value)) return "临时恢复数据库";
  return value;
}

export function backupStatusTone(status?: string | null): string {
  const key = String(status || "").trim();
  if (["success", "validated", "resolved", "merged", "switched"].includes(key)) return "text-emerald-700";
  if (["running", "queued", "temp_restored", "awaiting_approval", "approved"].includes(key)) return "text-blue-700";
  if (["failed", "open", "cancelled"].includes(key)) return "text-red-700";
  return "text-muted-foreground";
}
