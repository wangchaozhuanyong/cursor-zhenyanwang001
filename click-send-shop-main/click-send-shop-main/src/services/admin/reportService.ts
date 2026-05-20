import * as reportApi from "@/api/admin/report";
import type { ReportQuery } from "@/api/admin/report";

export type { ReportQuery };
import { downloadAdminCsv } from "@/utils/adminCsvDownload";

export async function fetchReportOverview(params?: ReportQuery) {
  const res = await reportApi.getReportOverview(params);
  return res.data;
}
export async function fetchSalesDailyReport(params?: ReportQuery) {
  const res = await reportApi.getSalesDaily(params);
  return res.data;
}
export async function fetchSalesMonthlyReport(params?: ReportQuery) {
  const res = await reportApi.getSalesMonthly(params);
  return res.data;
}
export async function fetchProductAnalysisReport(params?: ReportQuery) {
  const res = await reportApi.getProductsAnalysis(params);
  return res.data;
}
export async function fetchCategoryAnalysisReport(params?: ReportQuery) {
  const res = await reportApi.getCategoriesAnalysis(params);
  return res.data;
}
export async function fetchOrderAnalysisReport(params?: ReportQuery) {
  const res = await reportApi.getOrdersAnalysis(params);
  return res.data;
}
export async function fetchCustomerAnalysisReport(params?: ReportQuery) {
  const res = await reportApi.getCustomersAnalysis(params);
  return res.data;
}
export async function fetchActivityAnalysisReport(params?: ReportQuery) {
  const res = await reportApi.getActivitiesAnalysis(params);
  return res.data;
}
export async function fetchCouponAnalysisReport(params?: ReportQuery) {
  const res = await reportApi.getCouponsAnalysis(params);
  return res.data;
}
export async function fetchInventoryAnalysisReport(params?: ReportQuery) {
  const res = await reportApi.getInventoryAnalysis(params);
  return res.data;
}
export async function fetchSearchAnalysisReport(params?: ReportQuery) {
  const res = await reportApi.getSearchAnalysis(params);
  return res.data;
}
export async function fetchTrafficAnalysisReport(params?: ReportQuery) {
  const res = await reportApi.getTrafficAnalysis(params);
  return res.data;
}

export async function exportTrafficAnalysisCsv(params?: ReportQuery) {
  const q = new URLSearchParams({ type: "traffic_analysis" });
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      q.set(key, String(value));
    }
  });
  await downloadAdminCsv(`/admin/reports/export?${q.toString()}`, "traffic-analysis.csv");
}

