/** 监控规则 code → 中文名称（与 data_consistency_rules 种子数据一致） */
export const MONITORING_RULE_LABELS: Record<string, string> = {
  PRODUCT_STOCK_MISMATCH: "商品主表库存与 SKU 汇总不一致",
  SKU_NEGATIVE_STOCK: "SKU 库存为负数",
  PAYMENT_SUCCESS_ORDER_UNPAID: "支付成功但订单未支付",
  ORDER_PAYMENT_AMOUNT_MISMATCH: "订单应付金额与支付金额不一致",
  REFUND_AMOUNT_EXCEEDS_PAID: "退款金额超过实付金额",
  POINTS_BALANCE_MISMATCH: "积分余额与流水不一致",
  ORDER_CANCELLED_STOCK_NOT_RESTORED: "订单取消后库存疑似未回滚",
  CACHE_STALE_AFTER_ADMIN_UPDATE: "后台更新后缓存疑似过期",
  FILE_OBJECT_MISSING: "数据库文件对象缺失",
  USER_STATS_MISMATCH: "用户统计数据不一致",
};

export const MONITORING_MODULE_LABELS: Record<string, string> = {
  product: "商品",
  payment: "支付",
  loyalty: "积分",
  order: "订单",
  cache: "缓存",
  file: "文件",
  user: "用户",
  consistency: "一致性",
};

export const MONITORING_RUN_STATUS_LABELS: Record<string, string> = {
  running: "运行中",
  success: "成功",
  failed: "失败",
  cancelled: "已取消",
};

export const MONITORING_ANOMALY_STATUS_LABELS: Record<string, string> = {
  open: "待处理",
  investigating: "调查中",
  repair_pending: "待修复",
  repaired: "已修复",
  resolved: "已解决",
  ignored: "已忽略",
};

export const MONITORING_REPAIR_STATUS_LABELS: Record<string, string> = {
  pending: "待审批",
  approved: "已批准",
  executed: "已执行",
  failed: "失败",
  cancelled: "已取消",
};

export const MONITORING_RUN_TYPE_LABELS: Record<string, string> = {
  manual: "手动执行",
  scheduled: "定时任务",
  cron: "定时任务",
  auto: "自动检测",
};

export const MONITORING_ENTITY_TYPE_LABELS: Record<string, string> = {
  order: "订单",
  product: "商品",
  payment: "支付",
  payment_order: "支付单",
  user: "用户",
  sku: "SKU",
  variant: "规格",
  category: "分类",
  banner: "轮播图",
  file: "文件",
  cache: "缓存",
};

export const MONITORING_ROOT_CAUSE_LABELS: Record<string, string> = {
  UNKNOWN: "暂未识别明确原因",
};

export function formatMonitoringRuleLabel(code?: string | null, title?: string | null): string {
  if (title?.trim()) return title.trim();
  if (!code) return "-";
  return MONITORING_RULE_LABELS[code] || code;
}

export function formatMonitoringModuleLabel(module?: string | null): string {
  if (!module) return "-";
  const key = module.trim().toLowerCase();
  return MONITORING_MODULE_LABELS[key] || module;
}

export function formatMonitoringEntityTypeLabel(entityType?: string | null): string {
  if (!entityType) return "-";
  const key = entityType.trim().toLowerCase();
  return MONITORING_ENTITY_TYPE_LABELS[key] || entityType;
}

/** 关联对象：类型中文 + 缩短 ID，避免 order:uuid 英文展示 */
export function formatMonitoringEntityRef(entityType?: string | null, entityId?: string | null): string {
  if (!entityType && !entityId) return "-";
  const typeLabel = formatMonitoringEntityTypeLabel(entityType);
  const id = (entityId || "").trim();
  if (!id) return typeLabel;
  const shortId = id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
  return `${typeLabel} · ${shortId}`;
}

export function formatMonitoringRootCause(
  message?: string | null,
  code?: string | null,
): string {
  const text = (message || "").trim();
  if (text) return text;
  const key = (code || "").trim().toUpperCase();
  if (!key) return "-";
  return MONITORING_ROOT_CAUSE_LABELS[key] || code || "-";
}

export const MONITORING_SEVERITY_LABELS: Record<string, string> = {
  P0: "P0 紧急",
  P1: "P1 高危",
  P2: "P2 中等",
  P3: "P3 低危",
  INFO: "信息",
};

export function formatMonitoringSeverityLabel(value?: string | null): string {
  if (!value) return "";
  return MONITORING_SEVERITY_LABELS[value] || "";
}

export function formatMonitoringStatusLabel(value?: string | null): string {
  if (!value) return "-";
  return (
    MONITORING_RUN_STATUS_LABELS[value]
    || MONITORING_ANOMALY_STATUS_LABELS[value]
    || MONITORING_REPAIR_STATUS_LABELS[value]
    || value
  );
}

export function formatMonitoringRunTypeLabel(value?: string | null): string {
  if (!value) return "-";
  return MONITORING_RUN_TYPE_LABELS[value] || value;
}
