import * as rewardApi from "@/api/modules/reward";
import type { RewardRecord, RewardTransaction, RewardListParams } from "@/types/reward";
import type { PaginatedData } from "@/types/common";

export async function fetchRewardRecords(
  params?: RewardListParams,
): Promise<PaginatedData<RewardRecord>> {
  const res = await rewardApi.getRewardRecords(params);
  return res.data;
}

export async function fetchRewardTransactions(
  params?: RewardListParams,
): Promise<PaginatedData<RewardTransaction>> {
  const res = await rewardApi.getRewardTransactions(params);
  return res.data;
}

export async function fetchRewardBalance(): Promise<{ balance: number; pendingAmount: number }> {
  const res = await rewardApi.getRewardBalance();
  return res.data;
}

export async function requestWithdraw(
  amount: number,
  method: "wechat" | "bank" | "whatsapp" = "wechat",
  account = "",
): Promise<void> {
  await rewardApi.requestWithdraw(amount, method, account);
}
