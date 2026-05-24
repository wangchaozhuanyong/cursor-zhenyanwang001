import * as rewardSettingsApi from "@/api/admin/rewardSettings";
import type { RewardUsageSettings } from "@/types/reward";

export async function fetchRewardSettings(): Promise<RewardUsageSettings> {
  const res = await rewardSettingsApi.getRewardSettings();
  return res.data;
}

export async function saveRewardSettings(data: RewardUsageSettings) {
  const res = await rewardSettingsApi.updateRewardSettings(data);
  return res.data;
}
