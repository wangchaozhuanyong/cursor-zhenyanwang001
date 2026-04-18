import { get, put } from "../request";
import type { PointsRule } from "@/types/points";

export function getPointsRules() {
  return get<PointsRule[]>("/admin/points/rules");
}

export function updatePointsRule(id: string, data: Partial<PointsRule>) {
  return put<PointsRule>(`/admin/points/rules/${id}`, data);
}

export function adjustUserPoints(userId: string, amount: number, description: string) {
  return put<void>(`/admin/users/${userId}/points`, { amount, description });
}
