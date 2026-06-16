import type { Order } from "@/types/order";
import { safeOpenExternal } from "@/utils/safeOpen";

export type OrderLogisticsSnapshot = {
  carrier: string;
  trackingNo: string;
  statusLabel?: string;
  exceptionMessage?: string;
  hasException?: boolean;
  timeline?: NonNullable<Order["logistics_timeline"]>;
};

export function getOrderLogisticsSnapshot(order: Order): OrderLogisticsSnapshot {
  return {
    carrier: order.logistics_provider?.carrier || order.carrier || "",
    trackingNo: order.logistics_provider?.tracking_no || order.tracking_no || "",
    statusLabel: order.logistics_snapshot?.status_label || order.logistics_status_label || "",
    exceptionMessage: order.logistics_snapshot?.exception_message || order.logistics_exception_message || "",
    hasException: Boolean(order.logistics_snapshot?.has_exception || order.logistics_exception_type),
    timeline: order.logistics_timeline || [],
  };
}

/** 有外链则打开；否则返回快照供 LogisticsInfoModal 展示 */
export function resolveOrderLogisticsView(order: Order): "external" | "modal" | "empty" {
  if (order.logistics_provider?.tracking_url) return "external";
  const { carrier, trackingNo } = getOrderLogisticsSnapshot(order);
  if (carrier || trackingNo) return "modal";
  return "empty";
}

export function openOrderLogisticsExternal(order: Order): boolean {
  const url = order.logistics_provider?.tracking_url;
  if (!url) return false;
  safeOpenExternal(url);
  return true;
}
