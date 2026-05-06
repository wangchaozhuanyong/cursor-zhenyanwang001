import { get, post } from "../request";
import type { RewardRecord, RewardTransaction, WithdrawRequest, RewardListParams } from "@/types/reward";
import type { PaginatedData } from "@/types/common";

export function getRewardRecords(params?: RewardListParams) {
  return get<PaginatedData<RewardRecord>>("/rewards/records", params as Record<string, string>);
}

export function getRewardTransactions(params?: RewardListParams) {
  return get<PaginatedData<RewardTransaction>>("/rewards/transactions", params as Record<string, string>);
}

export function getRewardBalance() {
  return get<{ balance: number; pendingAmount: number }>("/rewards/balance");
}

export function requestWithdraw(
  amount: number,
  method: WithdrawRequest["method"],
  account: string,
) {
  return post<WithdrawRequest>("/rewards/withdraw", { amount, method, account });
}
