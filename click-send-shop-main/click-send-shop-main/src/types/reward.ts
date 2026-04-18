export type RewardStatus = "pending" | "approved" | "rejected" | "paid";

export interface RewardRecord {
  id: string;
  user_id: string;
  order_id: string;
  order_no: string;
  amount: number;
  rate: number;
  status: RewardStatus;
  created_at: string;
  paid_at?: string;
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
  page?: number;
  pageSize?: number;
}
