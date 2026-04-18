import * as dashboardApi from "@/api/admin/dashboard";

export async function fetchDashboardStats() {
  const res = await dashboardApi.getDashboardStats();
  return res.data;
}

export async function fetchChartData(range: "week" | "month" | "year") {
  const res = await dashboardApi.getDashboardChartData(range);
  return res.data;
}
