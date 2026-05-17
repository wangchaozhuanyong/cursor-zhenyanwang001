import type { OrderStatus, PaymentStatus } from "@/types/order";
import type { ReturnStatus } from "@/types/return";
import {
  THEME_BADGE_ACCENT,
  THEME_BADGE_DANGER,
  THEME_BADGE_MUTED,
  THEME_BADGE_PRICE,
  THEME_BADGE_PRIMARY,
  THEME_BADGE_SUCCESS,
  THEME_BADGE_WARNING,
} from "@/utils/themeVisuals";

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
  pending: { label: "待付款", badgeClass: THEME_BADGE_WARNING },
  paid: { label: "已付款", badgeClass: THEME_BADGE_PRICE },
  shipped: { label: "已发货", badgeClass: THEME_BADGE_PRIMARY },
  completed: { label: "已完成", badgeClass: THEME_BADGE_SUCCESS },
  cancelled: { label: "已取消", badgeClass: THEME_BADGE_DANGER },
  refunding: { label: "退款中", badgeClass: THEME_BADGE_WARNING },
  refunded: { label: "已退款", badgeClass: THEME_BADGE_MUTED },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; badgeClass: string }> = {
  pending: { label: "待支付", badgeClass: THEME_BADGE_MUTED },
  paid: { label: "已支付", badgeClass: THEME_BADGE_SUCCESS },
  failed: { label: "支付失败", badgeClass: THEME_BADGE_DANGER },
  refunded: { label: "已退款", badgeClass: THEME_BADGE_WARNING },
  partially_refunded: { label: "部分退款", badgeClass: THEME_BADGE_WARNING },
};

export const RETURN_STATUS_META: Record<ReturnStatus, { label: string; badgeClass: string }> = {
  pending: { label: "待审核", badgeClass: THEME_BADGE_WARNING },
  need_evidence: { label: "需补充凭证", badgeClass: THEME_BADGE_WARNING },
  approved: { label: "已通过", badgeClass: THEME_BADGE_PRIMARY },
  rejected: { label: "已拒绝", badgeClass: THEME_BADGE_DANGER },
  processing: { label: "处理中", badgeClass: THEME_BADGE_PRICE },
  waiting_return: { label: "待用户寄回", badgeClass: THEME_BADGE_PRIMARY },
  return_in_transit: { label: "退货运输中", badgeClass: THEME_BADGE_PRIMARY },
  received: { label: "已收货", badgeClass: THEME_BADGE_ACCENT },
  refund_pending: { label: "待退款", badgeClass: THEME_BADGE_WARNING },
  refunded: { label: "已退款", badgeClass: THEME_BADGE_SUCCESS },
  exchange_shipping: { label: "换货发货中", badgeClass: THEME_BADGE_ACCENT },
  completed: { label: "已完成", badgeClass: THEME_BADGE_SUCCESS },
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
