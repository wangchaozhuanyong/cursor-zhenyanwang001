import { get, post } from "@/api/request";
import type { RewardRecord, RewardTransaction, WithdrawRequest, RewardListParams, RewardConfig } from "@/types/reward";
import type { PaginatedData } from "@/types/common";

export function getRewardRecords(params?: RewardListParams) {
  return get<PaginatedData<RewardRecord>>("/rewards/records", params as unknown as Record<string, string>);
}

export function getRewardTransactions(params?: RewardListParams) {
  return get<PaginatedData<RewardTransaction>>("/rewards/transactions", params as unknown as Record<string, string>);
}

export function getRewardBalance() {
  return get<{ balance: number; pendingAmount: number; totalSpent?: number }>("/rewards/balance");
}

export function getRewardConfig() {
  return get<RewardConfig>("/rewards/config");
}

export function requestWithdraw(
  amount: number,
  method: WithdrawRequest["method"],
  account: string,
) {
  return post<WithdrawRequest>("/rewards/withdraw", { amount, method, account });
}

