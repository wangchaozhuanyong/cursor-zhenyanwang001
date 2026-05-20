import * as dashboardApi from "@/api/admin/dashboard";
import type { DashboardOverview } from "@/types/admin";

export async function fetchDashboardStats(): Promise<DashboardOverview> {
  const res = await dashboardApi.getDashboardStats();
  return res.data as DashboardOverview;
}

export type { DashboardOverview };

export async function fetchChartData(range: "week" | "month" | "year") {
  const res = await dashboardApi.getDashboardChartData(range);
  return res.data;
}
