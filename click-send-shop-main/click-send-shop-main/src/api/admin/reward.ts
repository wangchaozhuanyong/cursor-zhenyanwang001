import { get } from "../request";
import type { AdminRewardRecordsResponse, RewardListParams } from "@/types/reward";

export function getAdminRewardRecords(params?: RewardListParams) {
  return get<AdminRewardRecordsResponse>("/admin/rewards/records", params as Record<string, string>);
}
