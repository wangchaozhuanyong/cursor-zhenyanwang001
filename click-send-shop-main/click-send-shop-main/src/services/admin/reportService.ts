import * as reportApi from "@/api/admin/report";
import type { OperatingExpenseRecord, ReportQuery } from "@/api/admin/report";

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
export async function fetchProfitDailyReport(params?: ReportQuery) {
  const res = await reportApi.getProfitDaily(params);
  return res.data;
}
export async function fetchProfitMonthlyReport(params?: ReportQuery) {
  const res = await reportApi.getProfitMonthly(params);
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
export async function fetchPromotionConversionReport(params?: ReportQuery) {
  const res = await reportApi.getPromotionConversion(params);
  return res.data;
}
export async function fetchCouponAnalysisReport(params?: ReportQuery) {
  const res = await reportApi.getCouponsAnalysis(params);
  return res.data;
}
export async function fetchDiscountCostReport(params?: ReportQuery) {
  const res = await reportApi.getDiscountCost(params);
  return res.data;
}
export async function fetchPaymentFailureReport(params?: ReportQuery) {
  const res = await reportApi.getPaymentFailures(params);
  return res.data;
}
export async function fetchInventoryAnalysisReport(params?: ReportQuery) {
  const res = await reportApi.getInventoryAnalysis(params);
  return res.data;
}
export async function fetchInventoryOccupancyReport(params?: ReportQuery) {
  const res = await reportApi.getInventoryOccupancy(params);
  return res.data;
}
export async function fetchOrderCancelReasonReport(params?: ReportQuery) {
  const res = await reportApi.getOrderCancelReasons(params);
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

export async function exportReportCsv(type: string, params?: ReportQuery, fallbackName?: string) {
  const q = new URLSearchParams({ type });
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      q.set(key, String(value));
    }
  });
  await downloadAdminCsv(`/admin/reports/export?${q.toString()}`, fallbackName || `${type}.csv`);
}

export async function exportTrafficAnalysisCsv(params?: ReportQuery) {
  await exportReportCsv("traffic_analysis", params, "traffic-analysis.csv");
}

export async function exportProfitDailyCsv(params?: ReportQuery) {
  const q = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      q.set(key, String(value));
    }
  });
  await downloadAdminCsv(`/admin/reports/profit/export${q.toString() ? `?${q.toString()}` : ""}`, "profit-daily.csv");
}

export async function exportProfitMonthlyCsv(params?: ReportQuery) {
  const q = new URLSearchParams({ type: "profit_monthly" });
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      q.set(key, String(value));
    }
  });
  await downloadAdminCsv(`/admin/reports/export?${q.toString()}`, "profit-monthly.csv");
}

export async function fetchOperatingExpenses(params?: { range_preset?: string; date_from?: string; date_to?: string; category?: string }) {
  const res = await reportApi.getOperatingExpenses(params);
  return res.data as { summary?: Record<string, unknown>; list?: OperatingExpenseRecord[]; date_from?: string; date_to?: string };
}

export async function createOperatingExpense(payload: Omit<OperatingExpenseRecord, "id" | "created_at" | "updated_at" | "operator_id">) {
  const res = await reportApi.createOperatingExpense(payload);
  return res.data as OperatingExpenseRecord;
}

export async function updateOperatingExpense(id: string, payload: Omit<OperatingExpenseRecord, "id" | "created_at" | "updated_at" | "operator_id">) {
  const res = await reportApi.updateOperatingExpense(id, payload);
  return res.data as OperatingExpenseRecord;
}

export async function removeOperatingExpense(id: string) {
  const res = await reportApi.deleteOperatingExpense(id);
  return res.data as { ok: boolean };
}
