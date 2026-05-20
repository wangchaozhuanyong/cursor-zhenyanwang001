import * as dashboardApi from "@/api/admin/dashboard";
import type { DashboardOverview, DashboardStatsQuery } from "@/types/admin";

export async function fetchDashboardStats(query?: DashboardStatsQuery): Promise<DashboardOverview> {
  const res = await dashboardApi.getDashboardStats(query);
  return res.data as DashboardOverview;
}

export type { DashboardOverview, DashboardStatsQuery };
