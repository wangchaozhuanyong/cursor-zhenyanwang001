import type { OrderStatus, PaymentStatus } from "@/types/order";
import type { ReturnStatus } from "@/types/return";

export const ORDER_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  SHIPPED: "shipped",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  REFUNDING: "refunding",
  REFUNDED: "refunded",
} as const;

export const ORDER_STATUS_PROGRESS: Record<OrderStatus, number> = {
  pending: 10,
  paid: 35,
  shipped: 70,
  completed: 100,
  cancelled: 100,
  refunding: 80,
  refunded: 100,
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
} as const;

export const RETURN_STATUS = {
  PENDING: "pending",
  NEED_EVIDENCE: "need_evidence",
  APPROVED: "approved",
  REJECTED: "rejected",
  PROCESSING: "processing",
  WAITING_RETURN: "waiting_return",
  RETURN_IN_TRANSIT: "return_in_transit",
  RECEIVED: "received",
  REFUND_PENDING: "refund_pending",
  REFUNDED: "refunded",
  EXCHANGE_SHIPPING: "exchange_shipping",
  COMPLETED: "completed",
} as const;

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; badgeClass: string }> = {
  pending: { label: "待付款", badgeClass: "bg-amber-500/15 text-amber-600" },
  paid: { label: "已付款", badgeClass: "bg-gold/15 text-gold" },
  shipped: { label: "已发货", badgeClass: "bg-blue-500/15 text-blue-600" },
  completed: { label: "已完成", badgeClass: "bg-green-500/15 text-green-600" },
  cancelled: { label: "已取消", badgeClass: "bg-red-500/15 text-red-600" },
  refunding: { label: "退款中", badgeClass: "bg-orange-500/15 text-orange-600" },
  refunded: { label: "已退款", badgeClass: "bg-slate-500/15 text-slate-600" },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; badgeClass: string }> = {
  pending: { label: "待支付", badgeClass: "bg-secondary text-muted-foreground" },
  paid: { label: "已支付", badgeClass: "bg-emerald-500/10 text-emerald-600" },
  failed: { label: "支付失败", badgeClass: "bg-destructive/10 text-destructive" },
  refunded: { label: "已退款", badgeClass: "bg-orange-500/10 text-orange-600" },
  partially_refunded: { label: "部分退款", badgeClass: "bg-orange-500/10 text-orange-700" },
};

export const RETURN_STATUS_META: Record<ReturnStatus, { label: string; badgeClass: string }> = {
  pending: { label: "待审核", badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  need_evidence: { label: "需补充凭证", badgeClass: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  approved: { label: "已通过", badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  rejected: { label: "已拒绝", badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  processing: { label: "处理中", badgeClass: "bg-gold/10 text-gold" },
  waiting_return: { label: "待用户寄回", badgeClass: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300" },
  return_in_transit: { label: "退货运输中", badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  received: { label: "已收货", badgeClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" },
  refund_pending: { label: "待退款", badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  refunded: { label: "已退款", badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  exchange_shipping: { label: "换货发货中", badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  completed: { label: "已完成", badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

export const ORDER_STATUS_FILTER_OPTIONS: Array<{ value: "" | OrderStatus; label: string }> = [
  { value: "", label: "全部履约状态" },
  { value: ORDER_STATUS.PENDING, label: "待处理" },
  { value: ORDER_STATUS.PAID, label: "已付款/待发货" },
  { value: ORDER_STATUS.SHIPPED, label: "已发货" },
  { value: ORDER_STATUS.COMPLETED, label: "已完成" },
  { value: ORDER_STATUS.CANCELLED, label: "已取消" },
];

export const PAYMENT_STATUS_FILTER_OPTIONS: Array<{ value: "" | PaymentStatus; label: string }> = [
  { value: "", label: "全部支付状态" },
  { value: PAYMENT_STATUS.PENDING, label: "待支付" },
  { value: PAYMENT_STATUS.PAID, label: "已支付" },
  { value: PAYMENT_STATUS.FAILED, label: "支付失败" },
  { value: PAYMENT_STATUS.REFUNDED, label: "已退款" },
  { value: PAYMENT_STATUS.PARTIALLY_REFUNDED, label: "部分退款" },
];

export const RETURN_STATUS_FILTER_OPTIONS: Array<{ key: "all" | ReturnStatus; label: string }> = [
  { key: "all", label: "全部" },
  { key: RETURN_STATUS.PENDING, label: "待审核" },
  { key: RETURN_STATUS.NEED_EVIDENCE, label: "需补充凭证" },
  { key: RETURN_STATUS.APPROVED, label: "已通过" },
  { key: RETURN_STATUS.REJECTED, label: "已拒绝" },
  { key: RETURN_STATUS.PROCESSING, label: "处理中" },
  { key: RETURN_STATUS.WAITING_RETURN, label: "待寄回" },
  { key: RETURN_STATUS.RETURN_IN_TRANSIT, label: "运输中" },
  { key: RETURN_STATUS.RECEIVED, label: "已收货" },
  { key: RETURN_STATUS.REFUND_PENDING, label: "待退款" },
  { key: RETURN_STATUS.REFUNDED, label: "已退款" },
  { key: RETURN_STATUS.EXCHANGE_SHIPPING, label: "换货发货中" },
  { key: RETURN_STATUS.COMPLETED, label: "已完成" },
];

export const ORDER_STATUS_TAB_LABELS: Record<OrderStatus, string> = {
  [ORDER_STATUS.PENDING]: "待付款",
  [ORDER_STATUS.PAID]: "待发货",
  [ORDER_STATUS.SHIPPED]: "待收货",
  [ORDER_STATUS.COMPLETED]: "已完成",
  [ORDER_STATUS.CANCELLED]: "已取消",
  [ORDER_STATUS.REFUNDING]: "退款中",
  [ORDER_STATUS.REFUNDED]: "已退款",
};

export const EXPORT_TASK_STATUS_META: Record<"pending" | "success" | "failed", { label: string }> = {
  pending: { label: "处理中" },
  success: { label: "成功" },
  failed: { label: "失败" },
};

export const EXPORT_TASK_STATUS = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
} as const;

export function getOrderStatusLabel(status: string) {
  return ORDER_STATUS_META[status as OrderStatus]?.label ?? "未知状态";
}

export function getOrderStatusBadgeClass(status: string) {
  return ORDER_STATUS_META[status as OrderStatus]?.badgeClass ?? "bg-secondary text-muted-foreground";
}

export function getPaymentStatusLabel(status: string) {
  return PAYMENT_STATUS_META[status as PaymentStatus]?.label ?? "未知支付状态";
}

export function getPaymentStatusBadgeClass(status: string) {
  return PAYMENT_STATUS_META[status as PaymentStatus]?.badgeClass ?? "bg-secondary text-muted-foreground";
}

export function getReturnStatusLabel(status: string) {
  return RETURN_STATUS_META[status as ReturnStatus]?.label ?? "未知状态";
}

export function getReturnStatusBadgeClass(status: string) {
  return RETURN_STATUS_META[status as ReturnStatus]?.badgeClass ?? "bg-secondary text-muted-foreground";
}
