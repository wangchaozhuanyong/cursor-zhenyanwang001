import * as reportApi from "@/api/admin/report";

type ApiRange = "week" | "month" | "quarter" | "year";

export async function fetchSalesReport(range: ApiRange) {
  const res = await reportApi.getSalesReport(range);
  return res.data;
}

export async function fetchUserReport(range: ApiRange) {
  const res = await reportApi.getUserReport(range);
  return res.data;
}

export async function fetchProductReport() {
  const res = await reportApi.getProductReport();
  return res.data;
}

export async function fetchHomeEngagementReport(range: ApiRange) {
  const res = await reportApi.getHomeEngagementReport(range);
  return res.data;
}

const rangeMap: Record<string, ApiRange> = {
  "7d": "week",
  "30d": "month",
  "90d": "quarter",
};

/** 并行拉取三类报表，供 Page 只做展示与赋值 */
export async function loadAdminReportsBundle(dateRangeKey: string) {
  const apiRange = rangeMap[dateRangeKey] ?? "month";
  const [homeRes, salesRes, userRes, productRes] = await Promise.allSettled([
    fetchHomeEngagementReport(apiRange),
    fetchSalesReport(apiRange),
    fetchUserReport(apiRange),
    fetchProductReport(),
  ]);
  return {
    home: homeRes.status === "fulfilled" ? homeRes.value : undefined,
    sales: salesRes.status === "fulfilled" ? salesRes.value : undefined,
    users: userRes.status === "fulfilled" ? userRes.value : undefined,
    products: productRes.status === "fulfilled" ? productRes.value : undefined,
  };
}
