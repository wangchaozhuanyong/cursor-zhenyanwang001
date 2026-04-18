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

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
} as const;

export const RETURN_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  PROCESSING: "processing",
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
  approved: { label: "已通过", badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  rejected: { label: "已拒绝", badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  processing: { label: "处理中", badgeClass: "bg-gold/10 text-gold" },
  completed: { label: "已完成", badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

export const ORDER_STATUS_PROGRESS: OrderStatus[] = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.PAID,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.COMPLETED,
];

export const ORDER_STATUS_FILTER_OPTIONS: Array<{ value: "" | OrderStatus; label: string }> = [
  { value: "", label: "全部履约状态" },
  { value: ORDER_STATUS.PENDING, label: "待处理" },
  { value: ORDER_STATUS.PAID, label: "已付款(待发货)" },
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
  { key: RETURN_STATUS.APPROVED, label: "已通过" },
  { key: RETURN_STATUS.REJECTED, label: "已拒绝" },
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
  return ORDER_STATUS_META[status as OrderStatus]?.label ?? status;
}

export function getOrderStatusBadgeClass(status: string) {
  return ORDER_STATUS_META[status as OrderStatus]?.badgeClass ?? "bg-secondary text-muted-foreground";
}

export function getPaymentStatusLabel(status: string) {
  return PAYMENT_STATUS_META[status as PaymentStatus]?.label ?? status;
}

export function getPaymentStatusBadgeClass(status: string) {
  return PAYMENT_STATUS_META[status as PaymentStatus]?.badgeClass ?? "bg-secondary text-muted-foreground";
}

export function getReturnStatusLabel(status: string) {
  return RETURN_STATUS_META[status as ReturnStatus]?.label ?? status;
}

export function getReturnStatusBadgeClass(status: string) {
  return RETURN_STATUS_META[status as ReturnStatus]?.badgeClass ?? "bg-secondary text-muted-foreground";
}
