import { get } from "@/api/request";
import type { DashboardOverview, DashboardStatsQuery } from "@/types/admin";

export function getDashboardStats(query?: DashboardStatsQuery) {
  return get<DashboardOverview>("/admin/dashboard/stats", query);
}
