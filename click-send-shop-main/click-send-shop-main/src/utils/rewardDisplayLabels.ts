import type { RewardTransactionType } from "@/types/reward";

const REWARD_TX_LABEL: Record<string, string> = {
  settle: "返现入账",
  reverse: "明细",
  wallet_redeem_order: "订单抵扣",
  wallet_redeem_refund: "订单退款退回",
  consume_order: "返现钱包支付",
  refund_order: "订单退款退回",
  withdraw_request: "提现申请",
  withdraw_paid: "提现已打款",
  settle_points: "邀请积分入账",
  reverse_points: "邀请积分冲正",
};

export function formatRewardTransactionLabel(type?: RewardTransactionType | string, reason?: string) {
  const text = String(reason || "").trim();
  if (text) return text;
  return REWARD_TX_LABEL[String(type || "")] || "返现变动";
}

function formatRewardRecordMonth(value?: string) {
  if (!value) return "其他";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "其他";
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}年${month}月` : "其他";
}

export function groupRewardRecordsByMonth<T extends { created_at?: string }>(records: T[]) {
  const groups = new Map<string, T[]>();
  for (const record of records) {
    const key = formatRewardRecordMonth(record.created_at);
    const bucket = groups.get(key) || [];
    bucket.push(record);
    groups.set(key, bucket);
  }
  return Array.from(groups.entries());
}
