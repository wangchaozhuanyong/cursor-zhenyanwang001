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

export function formatDataCleanupPolicyKey(
  policyKey?: string | null,
  policyTitleByKey?: Record<string, string>,
): string {
  const key = String(policyKey || "").trim();
  if (!key) return "-";
  const title = policyTitleByKey?.[key]?.trim();
  if (title) return title;
  return key;
}
