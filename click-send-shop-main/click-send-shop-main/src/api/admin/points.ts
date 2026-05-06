import { get, put } from "../request";
import type { AdminPointsRecordsResponse, PointsListParams, PointsRule } from "@/types/points";

export function getPointsRules() {
  return get<PointsRule[]>("/admin/points/rules");
}

export function updatePointsRule(id: string, data: Partial<PointsRule>) {
  return put<PointsRule>(`/admin/points/rules/${id}`, data);
}

export function getAdminPointsRecords(params?: PointsListParams) {
  return get<AdminPointsRecordsResponse>("/admin/points/records", params as Record<string, string>);
}

export function adjustUserPoints(userId: string, amount: number, description: string) {
  return put<void>(`/admin/users/${userId}/points`, { amount, description });
}
