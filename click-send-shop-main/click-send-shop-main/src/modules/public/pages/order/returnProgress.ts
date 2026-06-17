import type { ReturnEvent, ReturnLogisticsTrack, ReturnRefundRecordRow, ReturnRequest, ReturnStatus } from "@/types/return";
import type { PublicLocale } from "@/i18n/publicLocale";

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

const RETURN_TYPE_LABELS_BY_LOCALE: Record<PublicLocale, Record<string, string>> = {
  zh: {
    refund: "仅退款",
    return_refund: "退货退款",
    exchange: "换货",
    repair: "维修",
  },
  en: {
    refund: "Refund only",
    return_refund: "Return and refund",
    exchange: "Exchange",
    repair: "Repair",
  },
};

const RETURN_STATUS_LABELS_BY_LOCALE: Record<PublicLocale, Record<ReturnStatus, string>> = {
  zh: {
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
  },
  en: {
    pending: "Pending review",
    need_evidence: "Evidence needed",
    approved: "Approved",
    rejected: "Rejected",
    processing: "Processing",
    waiting_return: "Return required",
    return_in_transit: "Return in transit",
    received: "Merchant received",
    refund_pending: "Refund pending",
    refunded: "Refunded",
    exchange_shipping: "Exchange shipping",
    completed: "Completed",
    cancelled: "Cancelled",
  },
};

export const RETURN_TYPE_LABELS = RETURN_TYPE_LABELS_BY_LOCALE.zh;
export const RETURN_STATUS_LABELS = RETURN_STATUS_LABELS_BY_LOCALE.zh;

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

const RETURN_FILTERS_BY_LOCALE: Record<PublicLocale, Array<{ key: ReturnFilterKey; label: string }>> = {
  zh: [
    { key: "all", label: "全部" },
    { key: "action", label: "待我操作" },
    { key: "processing", label: "处理中" },
    { key: "refund", label: "退款中" },
    { key: "done", label: "已完成" },
    { key: "rejected", label: "异常/关闭" },
  ],
  en: [
    { key: "all", label: "All" },
    { key: "action", label: "Needs action" },
    { key: "processing", label: "Processing" },
    { key: "refund", label: "Refunding" },
    { key: "done", label: "Completed" },
    { key: "rejected", label: "Closed" },
  ],
};

export const RETURN_FILTERS = RETURN_FILTERS_BY_LOCALE.zh;

const REFUND_RESULT_LABELS_BY_LOCALE: Record<PublicLocale, Record<string, string>> = {
  zh: {
    pending: "等待处理",
    success: "已处理",
    manual: "人工记录",
    refunded: "已退款",
    partially_refunded: "部分退款",
    failed: "退款失败",
  },
  en: {
    pending: "Pending",
    success: "Processed",
    manual: "Manual record",
    refunded: "Refunded",
    partially_refunded: "Partially refunded",
    failed: "Refund failed",
  },
};

const BUYER_ACTION_LABELS_BY_LOCALE: Record<PublicLocale, Record<BuyerReturnActionKey, { label: string; description: string }>> = {
  zh: {
    evidence: { label: "补充凭证", description: "商家需要更多照片或说明后继续审核。" },
    logistics: { label: "填写退货物流", description: "寄回商品后填写快递公司和物流单号。" },
    confirm: { label: "确认完成", description: "收到换货或退款确认无误后完成售后。" },
    cancel: { label: "取消申请", description: "还未寄回商品前，可以主动取消本次售后。" },
  },
  en: {
    evidence: { label: "Add evidence", description: "The merchant needs more photos or notes before continuing the review." },
    logistics: { label: "Submit return logistics", description: "After shipping the item back, enter the courier and tracking number." },
    confirm: { label: "Confirm completion", description: "Finish the case after you receive the exchange or confirm the refund." },
    cancel: { label: "Cancel request", description: "You can cancel this request before returning the item." },
  },
};

const FALLBACK_TEXT_BY_LOCALE: Record<PublicLocale, {
  returnType: string;
  status: string;
  order: string;
  logisticsTrack: string;
}> = {
  zh: {
    returnType: "售后",
    status: "未知状态",
    order: "订单",
    logisticsTrack: "物流状态更新",
  },
  en: {
    returnType: "After-sales",
    status: "Unknown status",
    order: "Order",
    logisticsTrack: "Logistics update",
  },
};

export function getReturnFilters(locale: PublicLocale = "zh") {
  return RETURN_FILTERS_BY_LOCALE[locale] || RETURN_FILTERS_BY_LOCALE.zh;
}

export function getReturnTypeLabel(type?: string, locale: PublicLocale = "zh") {
  const labels = RETURN_TYPE_LABELS_BY_LOCALE[locale] || RETURN_TYPE_LABELS_BY_LOCALE.zh;
  return labels[type || ""] || type || FALLBACK_TEXT_BY_LOCALE[locale]?.returnType || FALLBACK_TEXT_BY_LOCALE.zh.returnType;
}

export function getReturnStatusLabel(status?: string, locale: PublicLocale = "zh") {
  const labels = RETURN_STATUS_LABELS_BY_LOCALE[locale] || RETURN_STATUS_LABELS_BY_LOCALE.zh;
  return labels[status as ReturnStatus] || status || FALLBACK_TEXT_BY_LOCALE[locale]?.status || FALLBACK_TEXT_BY_LOCALE.zh.status;
}

export function getReturnItemName(ret: ReturnRequest, locale: PublicLocale = "zh") {
  const orderLabel = FALLBACK_TEXT_BY_LOCALE[locale]?.order || FALLBACK_TEXT_BY_LOCALE.zh.order;
  return ret.item_info?.product_name || ret.product_name || ret.sku_code || `${orderLabel} ${ret.order_no}`;
}

export function getReturnItemImage(ret: ReturnRequest) {
  return ret.item_info?.product_image || ret.product_image || "";
}

export function getRefundRecordStatusLabel(record: Pick<ReturnRefundRecordRow, "processing_result" | "verify_status">, locale: PublicLocale = "zh") {
  const labels = REFUND_RESULT_LABELS_BY_LOCALE[locale] || REFUND_RESULT_LABELS_BY_LOCALE.zh;
  return labels[record.processing_result || ""] || labels[record.verify_status || ""] || record.processing_result || record.verify_status || FALLBACK_TEXT_BY_LOCALE[locale]?.status || FALLBACK_TEXT_BY_LOCALE.zh.status;
}

export function getRefundRecordAmountText(record: Pick<ReturnRefundRecordRow, "amount" | "currency">) {
  const amount = Number(record.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return `${record.currency || "MYR"} ${amount.toFixed(2)}`;
}

export function getLogisticsTrackTitle(track: Pick<ReturnLogisticsTrack, "title" | "status" | "description">, locale: PublicLocale = "zh") {
  return track.title || track.status || track.description || FALLBACK_TEXT_BY_LOCALE[locale]?.logisticsTrack || FALLBACK_TEXT_BY_LOCALE.zh.logisticsTrack;
}

export function getBuyerReturnAction(ret: Pick<ReturnRequest, "status">, locale: PublicLocale = "zh"): {
  key: BuyerReturnActionKey;
  label: string;
  description: string;
} | null {
  const labels = BUYER_ACTION_LABELS_BY_LOCALE[locale] || BUYER_ACTION_LABELS_BY_LOCALE.zh;
  switch (ret.status) {
    case "need_evidence":
      return { key: "evidence", ...labels.evidence };
    case "waiting_return":
      return { key: "logistics", ...labels.logistics };
    case "exchange_shipping":
    case "refunded":
      return { key: "confirm", ...labels.confirm };
    case "pending":
    case "approved":
    case "processing":
      return { key: "cancel", ...labels.cancel };
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

export function buildReturnTimeline(ret: Pick<ReturnRequest, "status" | "created_at" | "events">, locale: PublicLocale = "zh"): ReturnTimelineItem[] {
  const eventItems = (ret.events || []).map((event: ReturnEvent) => ({
    key: event.id,
    title: event.title || getReturnStatusLabel(event.to_status || "", locale),
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
      title: getReturnStatusLabel(status, locale),
      time: index === 0 ? ret.created_at : null,
      done: true,
      current: index === arr.length - 1,
    }));
}
