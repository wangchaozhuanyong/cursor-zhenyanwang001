export type RewardStatus = "pending" | "approved" | "rejected" | "paid" | "reversed";
export type RewardTransactionType = "settle" | "reverse" | "withdraw_request" | "withdraw_paid";

export interface RewardRecord {
  id: string;
  user_id: string;
  order_id: string;
  order_no: string;
  amount: number;
  rate: number;
  level?: number;
  order_amount?: number;
  source_type?: string;
  remark?: string;
  status: RewardStatus;
  created_at: string;
  paid_at?: string;
  reversed_at?: string;
  user_phone?: string;
  user_nickname?: string;
}

export interface RewardTransaction {
  id: string;
  reward_record_id?: string;
  user_id: string;
  order_id?: string;
  order_no?: string;
  type: RewardTransactionType;
  amount: number;
  status: "success" | "pending" | "failed";
  reason?: string;
  created_at: string;
}

export interface RewardStats {
  settledAmount: number;
  reversedAmount: number;
  totalRecords: number;
  rewardedUsers: number;
}

export interface AdminRewardRecordsResponse {
  list: RewardRecord[];
  total: number;
  page: number;
  pageSize: number;
  stats: RewardStats;
}

export interface WithdrawRequest {
  id: string;
  user_id: string;
  amount: number;
  method: "wechat" | "bank" | "whatsapp";
  account: string;
  status: RewardStatus;
  created_at: string;
}

export interface RewardListParams {
  status?: RewardStatus;
  type?: RewardTransactionType;
  keyword?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
}
