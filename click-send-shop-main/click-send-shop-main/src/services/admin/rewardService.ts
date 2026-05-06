import * as rewardApi from "@/api/admin/reward";
import type { AdminRewardRecordsResponse, RewardListParams } from "@/types/reward";

export async function fetchAdminRewardRecords(
  params?: RewardListParams,
): Promise<AdminRewardRecordsResponse> {
  const res = await rewardApi.getAdminRewardRecords(params);
  return res.data;
}
