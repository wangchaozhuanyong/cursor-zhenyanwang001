import * as pointsApi from "@/api/admin/points";
import type { PointsRule } from "@/types/points";
import { unwrapList } from "@/services/responseNormalize";

export async function fetchPointsRules(): Promise<PointsRule[]> {
  const res = await pointsApi.getPointsRules();
  return unwrapList<PointsRule>(res.data);
}

export async function updatePointsRule(id: string, data: Partial<PointsRule>) {
  const res = await pointsApi.updatePointsRule(id, data);
  return res.data;
}

export async function adjustUserPoints(userId: string, amount: number, description: string) {
  await pointsApi.adjustUserPoints(userId, amount, description);
}
