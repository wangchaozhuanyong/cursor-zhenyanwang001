import { zhAuditSummary } from "@/utils/auditLogI18n";
import { formatBackupAlertMessage, formatBackupAlertTitle } from "./backupLabels";

export const ADMIN_EVENT_STATUS_LABELS: Record<string, string> = {
  open: "待处理",
  acknowledged: "已确认",
  in_progress: "处理中",
  resolved: "已完成",
  auto_resolved: "自动恢复",
  ignored: "已忽略",
  expired: "已过期",
};

export const ADMIN_EVENT_CATEGORY_LABELS: Record<string, string> = {
  order: "订单",
  payment: "支付",
  refund: "退款",
  stock: "库存",
  content: "内容",
  consistency: "数据",
  security: "安全",
  system: "系统",
  backup: "备份",
};

export const ADMIN_EVENT_TYPE_LABELS: Record<string, string> = {
  "order.created": "订单创建",
  "order.paid": "订单已付款",
  "order.paid_unhandled_timeout": "已付款订单待处理超时",
  "order.ship_timeout": "订单发货超时",
  "order.profit_negative": "订单利润为负",
  "order.high_value": "高价值订单",
  "payment.success_order_not_paid": "支付成功但订单未支付",
  "payment.amount_mismatch": "支付金额不一致",
  "payment.currency_mismatch": "支付币种不一致",
  "payment.webhook_signature_failed": "支付回调签名失败",
  "payment.webhook_rejected": "支付回调被拒绝",
  "payment.manual_mark_paid": "手动标记已支付",
  "payment.reconciliation_failed": "支付对账失败",
  "return.requested": "售后申请",
  "refund.requested": "退款申请",
  "refund.timeout_unhandled": "退款超时未处理",
  "refund.exceeds_paid": "退款金额超过实付金额",
  "refund.failed": "退款失败",
  "stock.low": "库存偏低",
  "stock.out": "库存售罄",
  "stock.negative": "库存为负",
  "stock.deduction_failed": "库存扣减失败",
  "stock.rollback_failed": "库存回滚失败",
  "stock.sku_missing": "SKU 缺失",
  "stock.manual_adjust_large": "大额库存手动调整",
  "product.price_zero": "商品价格为零",
  "product.cost_higher_than_price": "商品成本高于售价",
  "product.image_missing": "商品图片缺失",
  "product.s3_image_missing": "商品 S3 图片缺失",
  "product.no_stock_but_online": "无库存商品仍在线",
  "banner.image_missing": "Banner 图片缺失",
  "content.page_empty": "内容页面为空",
  "consistency.anomaly_p0": "P0 数据一致性异常",
  "consistency.anomaly_p1": "P1 数据一致性异常",
  PAYMENT_SUCCESS_ORDER_UNPAID: "支付成功但订单未支付",
  ORDER_PAYMENT_AMOUNT_MISMATCH: "订单支付金额不一致",
  POINTS_BALANCE_MISMATCH: "积分余额不一致",
  SKU_NEGATIVE_STOCK: "SKU 负库存",
  REFUND_AMOUNT_EXCEEDS_PAID: "退款金额超过实付金额",
  FILE_OBJECT_MISSING: "文件对象缺失",
  "security.admin_login_failed_many": "管理员多次登录失败",
  "security.admin_locked": "管理员账号锁定",
  "security.new_ip_login": "管理员新 IP 登录",
  "security.rbac_change": "权限配置变更",
  "security.admin_user_created": "管理员账号创建",
  "security.admin_user_disabled": "管理员账号禁用",
  "security.data_export": "后台数据导出",
  "security.permanent_delete": "永久删除操作",
  "security.payment_config_change": "支付配置变更",
  "security.site_settings_change": "站点设置变更",
  "security.payment_manual_change": "支付状态手动变更",
  "security.payment_event_replay": "支付事件重放",
  "security.refund_operation": "退款操作",
  "security.notification_config_change": "通知配置变更",
  "security.theme_change": "主题配置变更",
  "security.inventory_change": "库存变更",
  "security.return_operation": "售后操作",
  "security.export_operation": "数据导出操作",
  "security.product_change": "商品变更",
  "security.user_points_change": "用户积分调整",
  "security.user_password_reset": "用户密码重置",
  "security.user_status_change": "用户账号状态变更",
  "system.database_unavailable": "数据库不可用",
  "system.redis_unavailable": "Redis 不可用",
  "system.queue_failed": "队列任务失败",
  "system.queue_backlog_high": "队列积压过高",
  "system.scheduler_stopped": "调度器停止",
  "system.storage_unhealthy": "存储服务异常",
  "system.upload_failed": "上传失败",
  "system.backup_failed": "备份失败",
  "system.api_error_spike": "API 错误激增",
  "backup.full_failed": "数据库全量备份失败",
  "backup.binlog_upload_failed": "数据库增量日志上传失败",
  "backup.s3_upload_failed": "云端上传失败",
  "backup.verify_failed": "备份校验失败",
  "backup.stale_backup": "备份过期",
  "backup.restore_drill_failed": "恢复演练失败",
  "backup.disk_low": "磁盘空间不足",
  "backup.restore_failed": "恢复失败",
};

const SYSTEM_ERROR_MESSAGE_PATTERNS: Array<[RegExp, string]> = [
  [/MYSQL_BINLOG_DIR is required/i, "未配置 MySQL 增量日志目录，请在环境变量中设置 MYSQL_BINLOG_DIR。"],
  [/EACCES.*permission denied.*(?:scandir|readdir|read|access).*mysql/i, "无权限访问 MySQL 数据目录，请检查运行账号对数据库目录的读取权限。"],
  [/EACCES.*permission denied/i, "文件或目录权限不足，请检查服务运行账号权限。"],
  [/ENOSPC.*no space left/i, "磁盘空间已满，无法继续写入备份文件，请尽快清理磁盘。"],
  [/ENOENT.*no such file or directory/i, "找不到指定文件或目录，请检查路径配置是否正确。"],
  [/ECONNREFUSED|ENOTFOUND/i, "无法连接目标服务，请检查网络与服务状态。"],
  [/ETIMEDOUT|ECONNRESET/i, "网络连接超时或被重置，请检查网络与服务状态。"],
  [/EPERM.*operation not permitted/i, "操作被拒绝，请检查系统权限与安全策略。"],
];

function isBackupEvent(eventType: string | null | undefined, category: string | null | undefined): boolean {
  return category === "backup" || Boolean(eventType?.startsWith("backup."));
}

function backupAlertTypeFromEventType(eventType: string | null | undefined): string | null {
  if (!eventType?.startsWith("backup.")) return null;
  return eventType.slice("backup.".length) || null;
}

function translateTechnicalMessage(raw: string): string | null {
  if (/[\u4e00-\u9fff]/.test(raw)) return raw;
  for (const [pattern, zh] of SYSTEM_ERROR_MESSAGE_PATTERNS) {
    if (pattern.test(raw)) return zh;
  }
  return null;
}

const SECURITY_PAYMENT_CHANNEL_ZH: Record<string, string> = {
  ch_manual_bank: "手动银行转账",
  ch_stripe_checkout: "Stripe 在线支付",
  ch_reward_wallet: "返现余额支付",
};

function zhSecurityPaymentChannel(id: string): string {
  const key = id.trim();
  if (SECURITY_PAYMENT_CHANNEL_ZH[key]) return SECURITY_PAYMENT_CHANNEL_ZH[key];
  if (key.startsWith("ch_")) return key.slice(3).replace(/_/g, " ");
  return key;
}

/** 历史数据把渠道名、资源名写在 title 时的副标题 */
function formatSecurityEventDetail(detail: string, eventType?: string | null): string {
  const d = detail.trim();
  if (!d) return "";
  if (/^支付渠道「/.test(d)) return `变更对象：${d}`;
  if (/^…[0-9a-f]{6,}$/i.test(d)) return `变更对象：管理员账号 ${d}`;
  if (/^ch_[a-z0-9_]+$/i.test(d)) return `变更对象：支付渠道「${zhSecurityPaymentChannel(d)}」`;
  if (/Stripe/i.test(d) && eventType?.includes("payment")) return `变更对象：支付渠道「${d}」`;
  if (/^Favicon$/i.test(d) || /\bFavicon\b/i.test(d)) return "变更对象：网站图标";
  if (/^Logo$/i.test(d)) return "变更对象：站点 Logo 图片";
  if (/admin[-_]users/i.test(d)) return "变更对象：管理员账号";
  if (/[\u4e00-\u9fff]/.test(d)) return `变更说明：${d}`;
  return `变更对象：${d}`;
}

/** 安全事件库里误把接口详情（渠道名、Favicon 等）写成 title 时的识别 */
function isSecurityDetailTitle(raw: string, eventType?: string | null): boolean {
  if (!raw) return false;
  if (/^(GET|POST|PUT|PATCH|DELETE)\s+\S+/i.test(raw)) return true;
  if (/^支付渠道「/.test(raw)) return true;
  if (/^…[0-9a-f]{6,}$/i.test(raw)) return true;
  if (/^(Favicon|Logo|Stripe|admin-users|ch_[a-z0-9_]+)$/i.test(raw)) return true;
  if (/（Favicon|Logo）/i.test(raw) || /\bFavicon\b/i.test(raw)) return true;
  if (/Stripe/i.test(raw) && eventType?.includes("payment")) return true;
  if (/admin[-_]users/i.test(raw)) return true;
  return false;
}

export const ADMIN_EVENT_SEVERITY_LABELS: Record<string, string> = {
  P0: "紧急 P0",
  P1: "高 P1",
  P2: "中 P2",
  P3: "低 P3",
};

export function labelAdminEventSeverity(severity: string | null | undefined): string {
  if (!severity) return "-";
  return ADMIN_EVENT_SEVERITY_LABELS[severity] ?? severity;
}

export function labelAdminEventStatus(status: string | null | undefined): string {
  if (!status) return "-";
  return ADMIN_EVENT_STATUS_LABELS[status] ?? status;
}

export function labelAdminEventCategory(category: string | null | undefined): string {
  if (!category) return "-";
  return ADMIN_EVENT_CATEGORY_LABELS[category] ?? category;
}

export function labelAdminEventType(eventType: string | null | undefined): string {
  if (!eventType) return "-";
  if (ADMIN_EVENT_TYPE_LABELS[eventType]) return ADMIN_EVENT_TYPE_LABELS[eventType];
  return eventType.replace(/_/g, " ").replace(/\./g, " / ");
}

export function formatAdminEventTitle(
  title: string | null | undefined,
  eventType: string | null | undefined,
  category?: string | null | undefined,
): string {
  const raw = title?.trim();
  const typeLabel = eventType && ADMIN_EVENT_TYPE_LABELS[eventType] ? ADMIN_EVENT_TYPE_LABELS[eventType] : null;

  if (category === "security" && typeLabel) return typeLabel;

  if (isBackupEvent(eventType, category)) {
    const fromBackup = formatBackupAlertTitle(raw, backupAlertTypeFromEventType(eventType));
    if (fromBackup) return fromBackup;
  }

  if (typeLabel && (!raw || isSecurityDetailTitle(raw, eventType))) return typeLabel;

  if (raw && /[\u4e00-\u9fff]/.test(raw) && !isSecurityDetailTitle(raw, eventType)) return raw;

  return typeLabel || raw || labelAdminEventType(eventType);
}

export function formatAdminEventSubtitle(
  message: string | null | undefined,
  eventType: string | null | undefined,
  category?: string | null | undefined,
  title?: string | null | undefined,
): string {
  const trimmed = message?.trim();
  const titleRaw = title?.trim();
  if (isBackupEvent(eventType, category)) {
    return formatBackupAlertMessage(trimmed, backupAlertTypeFromEventType(eventType));
  }
  if (category === "security") {
    const detailSource = trimmed || (titleRaw && isSecurityDetailTitle(titleRaw, eventType) ? titleRaw : "");
    if (detailSource) {
      const fromAudit = zhAuditSummary(detailSource);
      if (fromAudit && fromAudit !== "-") return fromAudit;
      const fromDetail = formatSecurityEventDetail(detailSource, eventType);
      if (fromDetail) return fromDetail;
    }
  }
  if (trimmed) {
    if (/^(GET|POST|PUT|PATCH|DELETE)\s+\S+/i.test(trimmed)) {
      const fromAudit = zhAuditSummary(trimmed);
      if (fromAudit && fromAudit !== "-") return fromAudit;
    }
    const translated = translateTechnicalMessage(trimmed);
    if (translated) return translated;
    if (/[\u4e00-\u9fff]/.test(trimmed) && !/^(GET|POST|PUT|PATCH|DELETE)\s+\//i.test(trimmed)) return trimmed;
    if (/^[A-Z_]+:/.test(trimmed) || /\b(failed|error|denied|timeout)\b/i.test(trimmed)) {
      return "系统出现异常，请查看服务器日志。";
    }
    return trimmed;
  }
  return labelAdminEventType(eventType);
}
