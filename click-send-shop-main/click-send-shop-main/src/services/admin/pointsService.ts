import * as pointsApi from "@/api/admin/points";
import type { LoyaltyPointsSettings, ProductPointRule } from "@/api/admin/points";
import type { AdminPointsRecordsResponse, PointsListParams, PointsRule } from "@/types/points";
import { unwrapList } from "@/services/responseNormalize";

export async function fetchPointsRules(): Promise<PointsRule[]> {
  const res = await pointsApi.getPointsRules();
  return unwrapList<PointsRule>(res.data);
}

export async function updatePointsRule(id: string, data: Partial<PointsRule>) {
  const res = await pointsApi.updatePointsRule(id, data);
  return res.data;
}

export async function fetchAdminPointsRecords(
  params?: PointsListParams,
): Promise<AdminPointsRecordsResponse> {
  const res = await pointsApi.getAdminPointsRecords(params);
  return res.data;
}

export async function adjustUserPoints(userId: string, amount: number, description: string) {
  await pointsApi.adjustUserPoints(userId, amount, description);
}

export async function fetchPointsSettings(): Promise<LoyaltyPointsSettings> {
  const res = await pointsApi.getPointsSettings();
  return res.data || {};
}

export async function savePointsSettings(data: LoyaltyPointsSettings): Promise<LoyaltyPointsSettings> {
  const res = await pointsApi.updatePointsSettings(data);
  return res.data || {};
}

export async function fetchProductPointRules(params?: Record<string, string | number | boolean | undefined>) {
  const res = await pointsApi.getProductPointRules(params);
  return res.data;
}

export async function createProductPointRule(data: ProductPointRule) {
  const res = await pointsApi.createProductPointRule(data);
  return res.data;
}

export async function saveProductPointRule(id: string, data: ProductPointRule) {
  const res = await pointsApi.updateProductPointRule(id, data);
  return res.data;
}

export async function removeProductPointRule(id: string) {
  await pointsApi.deleteProductPointRule(id);
}

export type { LoyaltyPointsSettings, ProductPointRule };
