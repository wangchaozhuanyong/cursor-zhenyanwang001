import { del, get, post, put } from "@/api/request";
import type { AdminPointsRecordsResponse, PointsListParams, PointsRule } from "@/types/points";

export function getPointsRules() {
  // legacy: only for sign-in rule compatibility
  return get<PointsRule[]>("/admin/points/rules");
}

export function updatePointsRule(id: string, data: Partial<PointsRule>) {
  // legacy: only for sign-in rule compatibility
  return put<PointsRule>(`/admin/points/rules/${id}`, data);
}

export function getAdminPointsRecords(params?: PointsListParams) {
  return get<AdminPointsRecordsResponse>("/admin/points/records", params as unknown as Record<string, string>);
}

export function adjustUserPoints(userId: string, amount: number, description: string) {
  return post<void>(`/admin/users/${userId}/points`, { points: amount, reason: description });
}

export type LoyaltyPointsSettings = Record<string, string | number | boolean | null | undefined>;
export type ProductPointRule = {
  id?: string;
  name: string;
  scope_type: string;
  scope_id?: string | null;
  priority?: number;
  earn_enabled?: boolean | number;
  earn_mode?: string;
  fixed_points?: number;
  points_percent?: number;
  multiplier_percent?: number;
  redeem_enabled?: boolean | number;
  max_redeem_percent?: number | null;
  start_at?: string | null;
  end_at?: string | null;
  enabled?: boolean | number;
};

export function getPointsSettings() {
  return get<LoyaltyPointsSettings>("/admin/points/settings");
}

export function updatePointsSettings(data: LoyaltyPointsSettings) {
  return put<LoyaltyPointsSettings>("/admin/points/settings", data);
}

export function getProductPointRules(params?: Record<string, string | number | boolean | undefined>) {
  return get<{ list: ProductPointRule[]; total: number; page: number; pageSize: number }>("/admin/points/product-rules", params as Record<string, string>);
}

export function createProductPointRule(data: ProductPointRule) {
  return post<ProductPointRule>("/admin/points/product-rules", data);
}

export function updateProductPointRule(id: string, data: ProductPointRule) {
  return put<ProductPointRule>(`/admin/points/product-rules/${id}`, data);
}

export function deleteProductPointRule(id: string) {
  return del<void>(`/admin/points/product-rules/${id}`);
}

