/** 后台事件中心：状态、分类、事件类型中文展示 */

export const ADMIN_EVENT_STATUS_LABELS: Record<string, string> = {
  open: "待处理",
  acknowledged: "已确认",
  in_progress: "处理中",
  resolved: "已解决",
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

/** 与 migrations/105_admin_event_center.up.js 规则表一致 */
export const ADMIN_EVENT_TYPE_LABELS: Record<string, string> = {
  "order.created": "订单创建",
  "order.paid": "订单已付款",
  "order.paid_unhandled_timeout": "已付款订单超时未处理",
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

  "system.database_unavailable": "数据库不可用",
  "system.redis_unavailable": "Redis 不可用",
  "system.queue_failed": "队列任务失败",
  "system.queue_backlog_high": "队列积压过高",
  "system.scheduler_stopped": "调度器停止",
  "system.storage_unhealthy": "存储服务异常",
  "system.upload_failed": "上传失败",
  "system.backup_failed": "备份失败",
  "system.api_error_spike": "API 错误激增",
};

export function labelAdminEventStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return ADMIN_EVENT_STATUS_LABELS[status] ?? status;
}

export function labelAdminEventCategory(category: string | null | undefined): string {
  if (!category) return "—";
  return ADMIN_EVENT_CATEGORY_LABELS[category] ?? category;
}

export function labelAdminEventType(eventType: string | null | undefined): string {
  if (!eventType) return "—";
  if (ADMIN_EVENT_TYPE_LABELS[eventType]) return ADMIN_EVENT_TYPE_LABELS[eventType];
  return eventType
    .replace(/_/g, " ")
    .replace(/\./g, " · ");
}

export function formatAdminEventSubtitle(message: string | null | undefined, eventType: string | null | undefined): string {
  const trimmed = message?.trim();
  if (trimmed) return trimmed;
  return labelAdminEventType(eventType);
}
