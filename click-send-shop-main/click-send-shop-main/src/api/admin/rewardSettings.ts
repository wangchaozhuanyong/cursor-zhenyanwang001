import { get, put } from "@/api/request";
import type { RewardUsageSettings } from "@/types/reward";

export function getRewardSettings() {
  return get<RewardUsageSettings>("/admin/rewards/settings");
}

export function updateRewardSettings(data: RewardUsageSettings) {
  return put<RewardUsageSettings>("/admin/rewards/settings", data);
}
