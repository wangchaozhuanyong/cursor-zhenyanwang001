import type { RewardTransactionType } from "@/types/reward";

const REWARD_TX_LABEL: Record<string, string> = {
  settle: "返现入账",
  reverse: "冲正退回",
  wallet_redeem_order: "订单抵扣",
  wallet_redeem_refund: "订单退款退回",
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

export function groupRewardRecordsByMonth<T extends { created_at?: string }>(records: T[]) {
  const groups = new Map<string, T[]>();
  for (const record of records) {
    const date = record.created_at ? new Date(record.created_at) : null;
    const key = date && !Number.isNaN(date.getTime())
      ? `${date.getFullYear()}年${date.getMonth() + 1}月`
      : "其他";
    const bucket = groups.get(key) || [];
    bucket.push(record);
    groups.set(key, bucket);
  }
  return Array.from(groups.entries());
}
