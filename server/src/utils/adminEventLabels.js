/** 后台事件中心：状态、分类、类型与 Telegram 文案（与前端 adminEventLabels.ts 对齐） */

const ADMIN_EVENT_STATUS_LABELS = {
  open: '待处理',
  acknowledged: '已确认',
  in_progress: '处理中',
  resolved: '已解决',
  auto_resolved: '自动恢复',
  ignored: '已忽略',
  expired: '已过期',
};

const ADMIN_EVENT_CATEGORY_LABELS = {
  order: '订单',
  payment: '支付',
  refund: '退款',
  stock: '库存',
  content: '内容',
  consistency: '数据',
  security: '安全',
  system: '系统',
  backup: '备份',
};

const ADMIN_EVENT_ESCALATION_TARGET_LABELS = {
  boss: '负责人',
  admin_manager: '运营主管',
  super_admin: '超级管理员',
  operator: '运营人员',
};

const ADMIN_EVENT_TYPE_LABELS = {
  'order.created': '订单创建',
  'order.paid': '订单已付款',
  'order.paid_unhandled_timeout': '已付款订单超时未处理',
  'order.ship_timeout': '订单发货超时',
  'order.profit_negative': '订单利润为负',
  'order.high_value': '高价值订单',

  'payment.success_order_not_paid': '支付成功但订单未支付',
  'payment.amount_mismatch': '支付金额不一致',
  'payment.currency_mismatch': '支付币种不一致',
  'payment.webhook_signature_failed': '支付回调签名失败',
  'payment.webhook_rejected': '支付回调被拒绝',
  'payment.manual_mark_paid': '手动标记已支付',
  'payment.reconciliation_failed': '支付对账失败',

  'return.requested': '售后申请',
  'refund.requested': '退款申请',
  'refund.timeout_unhandled': '退款超时未处理',
  'refund.exceeds_paid': '退款金额超过实付金额',
  'refund.failed': '退款失败',

  'stock.low': '库存偏低',
  'stock.out': '库存售罄',
  'stock.negative': '库存为负',
  'stock.deduction_failed': '库存扣减失败',
  'stock.rollback_failed': '库存回滚失败',
  'stock.sku_missing': 'SKU 缺失',
  'stock.manual_adjust_large': '大额库存手动调整',

  'product.price_zero': '商品价格为零',
  'product.cost_higher_than_price': '商品成本高于售价',
  'product.image_missing': '商品图片缺失',
  'product.s3_image_missing': '商品 S3 图片缺失',
  'product.no_stock_but_online': '无库存商品仍在线',
  'banner.image_missing': 'Banner 图片缺失',
  'content.page_empty': '内容页面为空',

  'consistency.anomaly_p0': 'P0 数据一致性异常',
  'consistency.anomaly_p1': 'P1 数据一致性异常',
  PAYMENT_SUCCESS_ORDER_UNPAID: '支付成功但订单未支付',
  ORDER_PAYMENT_AMOUNT_MISMATCH: '订单支付金额不一致',
  POINTS_BALANCE_MISMATCH: '积分余额不一致',
  SKU_NEGATIVE_STOCK: 'SKU 负库存',
  REFUND_AMOUNT_EXCEEDS_PAID: '退款金额超过实付金额',
  FILE_OBJECT_MISSING: '文件对象缺失',

  'security.admin_login_failed_many': '管理员多次登录失败',
  'security.admin_locked': '管理员账号锁定',
  'security.new_ip_login': '管理员新 IP 登录',
  'security.rbac_change': '权限配置变更',
  'security.admin_user_created': '管理员账号创建',
  'security.admin_user_disabled': '管理员账号禁用',
  'security.data_export': '后台数据导出',
  'security.permanent_delete': '永久删除操作',
  'security.payment_config_change': '支付配置变更',
  'security.site_settings_change': '站点设置变更',
  'security.payment_manual_change': '支付状态手动变更',
  'security.payment_event_replay': '支付事件重放',
  'security.refund_operation': '退款操作',
  'security.notification_config_change': '通知配置变更',
  'security.theme_change': '主题配置变更',
  'security.inventory_change': '库存变更',
  'security.return_operation': '售后操作',
  'security.export_operation': '数据导出操作',
  'security.product_change': '商品变更',
  'security.user_points_change': '用户积分调整',
  'security.user_password_reset': '用户密码重置',
  'security.user_status_change': '用户账号状态变更',

  'system.database_unavailable': '数据库不可用',
  'system.redis_unavailable': 'Redis 不可用',
  'system.queue_failed': '队列任务失败',
  'system.queue_backlog_high': '队列积压过高',
  'system.scheduler_stopped': '调度器停止',
  'system.storage_unhealthy': '存储服务异常',
  'system.upload_failed': '上传失败',
  'system.backup_failed': '备份失败',
  'system.api_error_spike': 'API 错误激增',

  'backup.full_failed': '数据库全量备份失败',
  'backup.binlog_upload_failed': '数据库增量日志上传失败',
  'backup.s3_upload_failed': '云端上传失败',
  'backup.verify_failed': '备份校验失败',
  'backup.stale_backup': '备份过期',
  'backup.restore_drill_failed': '恢复演练失败',
  'backup.disk_low': '磁盘空间不足',
  'backup.restore_failed': '恢复失败',
};

const SYSTEM_ERROR_MESSAGE_PATTERNS = [
  [/EACCES.*permission denied.*(?:scandir|readdir|read|access).*mysql/i, '无权限访问 MySQL 数据目录，请检查运行账号对数据库目录的读取权限。'],
  [/EACCES.*permission denied/i, '文件或目录权限不足，请检查服务运行账号权限。'],
  [/ENOSPC.*no space left/i, '磁盘空间已满，无法继续写入，请尽快清理磁盘。'],
  [/ENOENT.*no such file or directory/i, '找不到指定文件或目录，请检查路径配置是否正确。'],
  [/ECONNREFUSED|ENOTFOUND/i, '无法连接目标服务，请检查网络与服务状态。'],
  [/ETIMEDOUT|ECONNRESET/i, '网络连接超时或被重置，请检查网络与服务状态。'],
  [/EPERM.*operation not permitted/i, '操作被拒绝，请检查系统权限与安全策略。'],
];

function parsePayload(payload) {
  if (!payload) return null;
  if (typeof payload === 'object') return payload;
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
  return null;
}

function translateTechnicalMessage(raw) {
  if (/[\u4e00-\u9fff]/.test(raw)) return raw;
  for (const [pattern, zh] of SYSTEM_ERROR_MESSAGE_PATTERNS) {
    if (pattern.test(raw)) return zh;
  }
  return null;
}

const SECURITY_PAYMENT_CHANNEL_ZH = {
  ch_manual_bank: '手动银行转账',
  ch_stripe_checkout: 'Stripe 在线支付',
  ch_reward_wallet: '返现余额支付',
};

function zhSecurityPaymentChannel(id) {
  const key = String(id || '').trim();
  if (SECURITY_PAYMENT_CHANNEL_ZH[key]) return SECURITY_PAYMENT_CHANNEL_ZH[key];
  if (key.startsWith('ch_')) return key.slice(3).replace(/_/g, ' ');
  return key;
}

function isSecurityDetailTitle(raw, eventType) {
  if (!raw) return false;
  if (/^(GET|POST|PUT|PATCH|DELETE)\s+\S+/i.test(raw)) return true;
  if (/^支付渠道「/.test(raw)) return true;
  if (/^…[0-9a-f]{6,}$/i.test(raw)) return true;
  if (/^(Favicon|Logo|Stripe|admin-users|ch_[a-z0-9_]+)$/i.test(raw)) return true;
  if (/（Favicon|Logo）/i.test(raw) || /\bFavicon\b/i.test(raw)) return true;
  if (/Stripe/i.test(raw) && eventType?.includes('payment')) return true;
  if (/admin[-_]users/i.test(raw)) return true;
  return false;
}

function formatSecurityEventDetail(detail, eventType) {
  const d = String(detail || '').trim();
  if (!d) return '';
  if (/^支付渠道「/.test(d)) return `变更对象：${d}`;
  if (/^…[0-9a-f]{6,}$/i.test(d)) return `变更对象：管理员账号 ${d}`;
  if (/^ch_[a-z0-9_]+$/i.test(d)) return `变更对象：支付渠道「${zhSecurityPaymentChannel(d)}」`;
  if (/Stripe/i.test(d) && eventType?.includes('payment')) return `变更对象：支付渠道「${d}」`;
  if (/^Favicon$/i.test(d) || /\bFavicon\b/i.test(d)) return '变更对象：网站图标';
  if (/^Logo$/i.test(d)) return '变更对象：站点 Logo 图片';
  if (/admin[-_]users/i.test(d)) return '变更对象：管理员账号';
  if (/[\u4e00-\u9fff]/.test(d)) return `变更说明：${d}`;
  return `变更对象：${d}`;
}

const { formatAdminSecurityEventMessage } = require('./adminSecurityEventMessage');

function zhAuditSummaryLite(summary) {
  const s = String(summary || '').trim();
  if (!s) return '-';
  const m = s.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)\s+(allowed|failed)$/i);
  if (m) {
    const suffix = String(m[3]).toLowerCase() === 'failed' ? '失败' : '已执行';
    return formatAdminSecurityEventMessage(m[1], m[2], suffix);
  }
  return s;
}

function labelAdminEventStatus(status) {
  if (!status) return '—';
  return ADMIN_EVENT_STATUS_LABELS[status] ?? status;
}

function labelAdminEventCategory(category) {
  if (!category) return '—';
  return ADMIN_EVENT_CATEGORY_LABELS[category] ?? category;
}

function labelAdminEventType(eventType) {
  if (!eventType) return '—';
  if (ADMIN_EVENT_TYPE_LABELS[eventType]) return ADMIN_EVENT_TYPE_LABELS[eventType];
  return String(eventType).replace(/_/g, ' ').replace(/\./g, ' · ');
}

function labelAdminEventEscalationTarget(target) {
  if (!target) return '—';
  return ADMIN_EVENT_ESCALATION_TARGET_LABELS[target] ?? target;
}

function formatAdminEventTitle(title, eventType, category) {
  const raw = title?.trim();
  const typeLabel = eventType && ADMIN_EVENT_TYPE_LABELS[eventType] ? ADMIN_EVENT_TYPE_LABELS[eventType] : null;
  if (category === 'security' && typeLabel) return typeLabel;
  if (typeLabel && (!raw || isSecurityDetailTitle(raw, eventType))) return typeLabel;
  if (raw && /[\u4e00-\u9fff]/.test(raw) && !isSecurityDetailTitle(raw, eventType)) return raw;
  return typeLabel || raw || labelAdminEventType(eventType);
}

function formatAdminEventSubtitle(message, eventType, category, title) {
  const trimmed = message?.trim();
  const titleRaw = title?.trim();
  if (category === 'security') {
    const detailSource = trimmed || (titleRaw && isSecurityDetailTitle(titleRaw, eventType) ? titleRaw : '');
    if (detailSource) {
      const fromAudit = zhAuditSummaryLite(detailSource);
      if (fromAudit && fromAudit !== '-') return fromAudit;
      const fromDetail = formatSecurityEventDetail(detailSource, eventType);
      if (fromDetail) return fromDetail;
    }
  }
  if (trimmed) {
    if (/^(GET|POST|PUT|PATCH|DELETE)\s+\S+/i.test(trimmed)) {
      const fromAudit = zhAuditSummaryLite(trimmed);
      if (fromAudit && fromAudit !== '-') return fromAudit;
    }
    const translated = translateTechnicalMessage(trimmed);
    if (translated) return translated;
    if (/[\u4e00-\u9fff]/.test(trimmed) && !/^(GET|POST|PUT|PATCH|DELETE)\s+\//i.test(trimmed)) return trimmed;
    if (/^[A-Z_]+:/.test(trimmed) || /\b(failed|error|denied|timeout)\b/i.test(trimmed)) {
      return '系统出现异常，请联系技术人员查看服务器日志。';
    }
    return trimmed;
  }
  return labelAdminEventType(eventType);
}

function formatAdminEventDateTime(value) {
  if (value == null || value === '') return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  return `${get('year')}年${get('month')}月${get('day')}日 ${get('hour')}:${get('minute')}:${get('second')}（北京时间）`;
}

function formatAdminEventEntityRef(event) {
  const payload = parsePayload(event.payload);
  const entityType = event.entity_type;
  const category = event.category;

  if (entityType === 'order' || category === 'order') {
    const orderNo = payload?.orderNo || payload?.order_no;
    if (orderNo) return `关联订单：#${orderNo}`;
  }

  if (!event.entity_id) return '';
  const typeLabel = labelAdminEventCategory(category) || entityType || '对象';
  return `关联对象：${typeLabel} · ${event.entity_id}`;
}

/**
 * 后台事件升级 Telegram 正文（中文标签 + 北京时间）
 * @param {object} event 数据库行（snake_case）
 */
function formatTelegramEscalationText(event) {
  const targetCode = event.escalation_target || (event.severity === 'P0' ? 'boss' : 'admin_manager');
  const title = formatAdminEventTitle(event.title, event.event_type, event.category);
  const message = formatAdminEventSubtitle(event.message, event.event_type, event.category, event.title);
  const entityLine = formatAdminEventEntityRef(event);

  return [
    `【后台事件升级】${event.severity || '—'} ${title}`,
    `通知对象：${labelAdminEventEscalationTarget(targetCode)}`,
    `当前状态：${labelAdminEventStatus(event.status)}`,
    `事件类型：${labelAdminEventType(event.event_type)}`,
    entityLine || null,
    message ? `说明：${message}` : null,
    `创建时间：${formatAdminEventDateTime(event.created_at)}`,
  ].filter(Boolean).join('\n');
}

/** 后台事件新建告警（P0/P1 即时推送） */
function formatTelegramEventAlertText(event) {
  const title = formatAdminEventTitle(event.title, event.event_type, event.category);
  const message = formatAdminEventSubtitle(event.message, event.event_type, event.category, event.title);
  const entityLine = formatAdminEventEntityRef(event);

  return [
    `【后台事件告警】${event.severity || '—'} ${title}`,
    `当前状态：${labelAdminEventStatus(event.status)}`,
    `事件类型：${labelAdminEventType(event.event_type)}`,
    entityLine || null,
    message ? `说明：${message}` : null,
    `创建时间：${formatAdminEventDateTime(event.created_at)}`,
  ].filter(Boolean).join('\n');
}

module.exports = {
  ADMIN_EVENT_STATUS_LABELS,
  ADMIN_EVENT_TYPE_LABELS,
  labelAdminEventStatus,
  labelAdminEventCategory,
  labelAdminEventType,
  labelAdminEventEscalationTarget,
  formatAdminEventTitle,
  formatAdminEventSubtitle,
  formatAdminEventDateTime,
  formatTelegramEscalationText,
  formatTelegramEventAlertText,
};
