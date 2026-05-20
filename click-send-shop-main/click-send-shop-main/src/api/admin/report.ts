import { del, get, post, put } from "@/api/request";

export type ReportQuery = {
  range_preset?: string;
  date_from?: string;
  date_to?: string;
  granularity?: "day" | "week" | "month";
  compare?: "previous_period" | "previous_week" | "previous_month" | "";
  category_id?: string;
  product_id?: string;
  activity_id?: string;
  coupon_id?: string;
  payment_status?: string;
  order_status?: string;
  user_type?: string;
  device?: string;
  visitor_type?: string;
  traffic_source?: string;
  page_type?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
};

export type OperatingExpenseRecord = {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  title: string;
  remark?: string;
  operator_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export function getReportOverview(params?: ReportQuery) {
  return get<Record<string, unknown>>("/admin/reports/overview", params as unknown as Record<string, unknown>);
}
export function getSalesDaily(params?: ReportQuery) {
  return get<Record<string, unknown>>("/admin/reports/sales/daily", params as unknown as Record<string, unknown>);
}
export function getSalesMonthly(params?: ReportQuery) {
  return get<Record<string, unknown>>("/admin/reports/sales/monthly", params as unknown as Record<string, unknown>);
}
export function getProfitDaily(params?: ReportQuery) {
  return get<Record<string, unknown>>("/admin/reports/profit/daily", params as unknown as Record<string, unknown>);
}
export function getProductsAnalysis(params?: ReportQuery) {
  return get<Record<string, unknown>>("/admin/reports/products/analysis", params as unknown as Record<string, unknown>);
}
export function getCategoriesAnalysis(params?: ReportQuery) {
  return get<Record<string, unknown>>("/admin/reports/categories/analysis", params as unknown as Record<string, unknown>);
}
export function getOrdersAnalysis(params?: ReportQuery) {
  return get<Record<string, unknown>>("/admin/reports/orders/analysis", params as unknown as Record<string, unknown>);
}
export function getCustomersAnalysis(params?: ReportQuery) {
  return get<Record<string, unknown>>("/admin/reports/customers/analysis", params as unknown as Record<string, unknown>);
}
export function getActivitiesAnalysis(params?: ReportQuery) {
  return get<Record<string, unknown>>("/admin/reports/activities/analysis", params as unknown as Record<string, unknown>);
}
export function getCouponsAnalysis(params?: ReportQuery) {
  return get<Record<string, unknown>>("/admin/reports/coupons/analysis", params as unknown as Record<string, unknown>);
}
export function getInventoryAnalysis(params?: ReportQuery) {
  return get<Record<string, unknown>>("/admin/reports/inventory/analysis", params as unknown as Record<string, unknown>);
}
export function getSearchAnalysis(params?: ReportQuery) {
  return get<Record<string, unknown>>("/admin/reports/search/analysis", params as unknown as Record<string, unknown>);
}
export function getTrafficAnalysis(params?: ReportQuery) {
  return get<Record<string, unknown>>("/admin/reports/traffic", params as unknown as Record<string, unknown>);
}

export function getOperatingExpenses(params?: { range_preset?: string; date_from?: string; date_to?: string; category?: string }) {
  return get<Record<string, unknown>>("/admin/expenses", params as unknown as Record<string, unknown>);
}

export function createOperatingExpense(payload: Omit<OperatingExpenseRecord, "id" | "created_at" | "updated_at" | "operator_id">) {
  return post<OperatingExpenseRecord>("/admin/expenses", payload);
}

export function updateOperatingExpense(id: string, payload: Omit<OperatingExpenseRecord, "id" | "created_at" | "updated_at" | "operator_id">) {
  return put<OperatingExpenseRecord>(`/admin/expenses/${id}`, payload);
}

export function deleteOperatingExpense(id: string) {
  return del<{ ok: boolean }>(`/admin/expenses/${id}`);
}
