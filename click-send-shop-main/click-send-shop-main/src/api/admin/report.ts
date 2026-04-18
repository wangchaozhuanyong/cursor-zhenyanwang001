import { get } from "../request";
import type { ReportData } from "@/types/admin";

type ApiRange = "week" | "month" | "quarter" | "year";

export function getSalesReport(range: ApiRange) {
  return get<ReportData>("/admin/reports/sales", { range });
}

export function getUserReport(range: ApiRange) {
  return get<ReportData>("/admin/reports/users", { range });
}

export function getProductReport() {
  return get<ReportData>("/admin/reports/products");
}

export function exportSalesReportCsv(range: ApiRange) {
  return `/admin/reports/sales/export?range=${range}`;
}

export function exportUserReportCsv(range: ApiRange) {
  return `/admin/reports/users/export?range=${range}`;
}

export function exportProductReportCsv() {
  return `/admin/reports/products/export`;
}
