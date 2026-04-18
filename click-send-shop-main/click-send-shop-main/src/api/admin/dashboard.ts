import { get } from "../request";
import type { DashboardStats } from "@/types/admin";

export function getDashboardStats() {
  return get<DashboardStats>("/admin/dashboard/stats");
}

export function getDashboardChartData(range: "week" | "month" | "year") {
  return get<{ labels: string[]; values: number[] }>("/admin/dashboard/chart", { range });
}
