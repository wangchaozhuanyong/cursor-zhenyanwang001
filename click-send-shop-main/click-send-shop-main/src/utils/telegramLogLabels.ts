/** Telegram 通知日志：事件类型、发送状态、错误摘要中文展示 */

import { labelAdminEventType } from "./adminEventLabels";

export const TELEGRAM_LOG_EVENT_TYPE_LABELS: Record<string, string> = {
  payment_success: "订单付款成功通知",
  test: "连接测试",
  admin_event_alert: "后台事件告警",
  admin_event_escalation: "后台事件升级",
};

export const TELEGRAM_LOG_SEND_STATUS_LABELS: Record<string, string> = {
  sent: "已发送",
  failed: "发送失败",
  skipped: "已跳过",
  pending: "待发送",
};

/** 日志表 error_message 常见英文 → 中文（与 server telegram.service 写入一致） */
const TELEGRAM_LOG_ERROR_MESSAGE_LABELS: Record<string, string> = {
  "Telegram feature disabled": "站点未开启 Telegram 订单通知",
  "Telegram disabled": "Telegram 通知未启用",
  "Telegram bot token not configured": "未配置 Bot Token",
  "Telegram admin chat id not configured": "未配置管理员 Chat ID",
  "Telegram payment_success already sent": "该订单付款通知已发送过",
  "Order not found": "订单不存在",
  "后台事件 Telegram 通知未启用": "后台事件 Telegram 通知未启用",
  "未开启 P0/P1 新事件即时提醒": "未开启 P0/P1 新事件即时提醒",
  "未配置 Bot Token 或 Chat ID": "未配置 Bot Token 或 Chat ID",
  "订单 Telegram 通知未启用": "订单 Telegram 通知未启用",
};

export function labelTelegramLogEventType(eventType: string | null | undefined): string {
  if (!eventType) return "—";
  if (TELEGRAM_LOG_EVENT_TYPE_LABELS[eventType]) return TELEGRAM_LOG_EVENT_TYPE_LABELS[eventType];
  return labelAdminEventType(eventType);
}

export function labelTelegramLogSendStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return TELEGRAM_LOG_SEND_STATUS_LABELS[status] ?? status;
}

export function labelTelegramLogErrorMessage(message: string | null | undefined): string {
  const raw = message?.trim();
  if (!raw || raw === "-") return "—";
  if (TELEGRAM_LOG_ERROR_MESSAGE_LABELS[raw]) return TELEGRAM_LOG_ERROR_MESSAGE_LABELS[raw];
  if (/[\u4e00-\u9fff]/.test(raw)) return raw;
  return raw;
}

export function telegramLogSendStatusClass(status: string | null | undefined): string {
  switch (status) {
    case "sent":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    case "failed":
      return "bg-destructive/15 text-destructive";
    case "skipped":
      return "bg-muted text-muted-foreground";
    case "pending":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-300";
    default:
      return "bg-secondary text-foreground";
  }
}
