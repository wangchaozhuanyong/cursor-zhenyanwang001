import type { ReturnEvent, ReturnRequest, ReturnStatus } from "@/types/return";

export type ReturnFilterKey = "all" | "action" | "processing" | "refund" | "done" | "rejected";
export type BuyerReturnActionKey = "evidence" | "logistics" | "confirm" | "cancel";

export type ReturnTimelineItem = {
  key: string;
  title: string;
  note?: string | null;
  time?: string | null;
  done: boolean;
  current: boolean;
};

export const RETURN_TYPE_LABELS: Record<string, string> = {
  refund: "仅退款",
  return_refund: "退货退款",
  exchange: "换货",
  repair: "维修",
};

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  pending: "待审核",
  need_evidence: "需补充凭证",
  approved: "已通过",
  rejected: "已拒绝",
  processing: "处理中",
  waiting_return: "待寄回",
  return_in_transit: "退货运输中",
  received: "商家已收货",
  refund_pending: "待退款",
  refunded: "已退款",
  exchange_shipping: "换货发货中",
  completed: "已完成",
  cancelled: "已取消",
};

const STATUS_ORDER: ReturnStatus[] = [
  "pending",
  "need_evidence",
  "approved",
  "processing",
  "waiting_return",
  "return_in_transit",
  "received",
  "refund_pending",
  "refunded",
  "exchange_shipping",
  "completed",
  "rejected",
  "cancelled",
];

export const RETURN_FILTERS: Array<{ key: ReturnFilterKey; label: string }> = [
  { key: "all", label: "全部" },
  { key: "action", label: "待我操作" },
  { key: "processing", label: "处理中" },
  { key: "refund", label: "退款中" },
  { key: "done", label: "已完成" },
  { key: "rejected", label: "异常/关闭" },
];

export function getReturnTypeLabel(type?: string) {
  return RETURN_TYPE_LABELS[type || ""] || type || "售后";
}

export function getReturnStatusLabel(status?: string) {
  return RETURN_STATUS_LABELS[status as ReturnStatus] || status || "未知状态";
}

export function getReturnItemName(ret: ReturnRequest) {
  return ret.item_info?.product_name || ret.product_name || ret.sku_code || `订单 ${ret.order_no}`;
}

export function getReturnItemImage(ret: ReturnRequest) {
  return ret.item_info?.product_image || ret.product_image || "";
}

export function getBuyerReturnAction(ret: Pick<ReturnRequest, "status">): {
  key: BuyerReturnActionKey;
  label: string;
  description: string;
} | null {
  switch (ret.status) {
    case "need_evidence":
      return { key: "evidence", label: "补充凭证", description: "商家需要更多照片或说明后继续审核。" };
    case "waiting_return":
      return { key: "logistics", label: "填写退货物流", description: "寄回商品后填写快递公司和物流单号。" };
    case "exchange_shipping":
    case "refunded":
      return { key: "confirm", label: "确认完成", description: "收到换货或退款确认无误后完成售后。" };
    case "pending":
    case "approved":
    case "processing":
      return { key: "cancel", label: "取消申请", description: "还未寄回商品前，可以主动取消本次售后。" };
    default:
      return null;
  }
}

export function shouldShowReturnInFilter(ret: ReturnRequest, filter: ReturnFilterKey) {
  if (filter === "all") return true;
  if (filter === "action") {
    const action = getBuyerReturnAction(ret);
    return action?.key === "evidence" || action?.key === "logistics" || action?.key === "confirm";
  }
  if (filter === "processing") {
    return ["pending", "approved", "processing", "waiting_return", "return_in_transit", "received", "exchange_shipping"].includes(ret.status);
  }
  if (filter === "refund") return ["refund_pending", "refunded"].includes(ret.status);
  if (filter === "done") return ret.status === "completed";
  if (filter === "rejected") return ["rejected", "cancelled"].includes(ret.status);
  return true;
}

export function buildReturnTimeline(ret: Pick<ReturnRequest, "status" | "created_at" | "events">): ReturnTimelineItem[] {
  const eventItems = (ret.events || []).map((event: ReturnEvent) => ({
    key: event.id,
    title: event.title || getReturnStatusLabel(event.to_status || ""),
    note: event.note,
    time: event.created_at,
    done: true,
    current: event.to_status === ret.status,
  }));
  if (eventItems.length > 0) {
    const hasCurrent = eventItems.some((item) => item.current);
    return hasCurrent ? eventItems : eventItems.map((item, index) => ({
      ...item,
      current: index === eventItems.length - 1,
    }));
  }

  const currentIndex = Math.max(0, STATUS_ORDER.indexOf(ret.status as ReturnStatus));
  return STATUS_ORDER
    .filter((status) => !["rejected", "cancelled"].includes(status) || status === ret.status)
    .slice(0, currentIndex + 1)
    .map((status, index, arr) => ({
      key: status,
      title: getReturnStatusLabel(status),
      time: index === 0 ? ret.created_at : null,
      done: true,
      current: index === arr.length - 1,
    }));
}
