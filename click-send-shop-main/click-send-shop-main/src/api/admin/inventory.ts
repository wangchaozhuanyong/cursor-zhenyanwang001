import { del, get, patch, post } from "@/api/request";
import type { PaginatedData } from "@/types/common";
import type { InventoryChangeType, InventoryConversionOrder, InventoryPackRule, InventoryReplenishmentAlert, InventorySku, InventoryStockRecord, InventorySummary, PurchaseOrder, PurchaseOrderDetail, SmartReplenishmentPreviewResult } from "@/types/inventory";
import { downloadAdminCsv } from "@/utils/adminCsvDownload";

export function getInventorySummary() {
  return get<InventorySummary>("/admin/inventory/summary");
}

export function getInventorySkus(params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category_id?: string;
  lifecycle_status?: string | number;
  stock_status?: "normal" | "low" | "out";
  lowStock?: boolean;
  sku_code?: string;
  sort?: string;
}) {
  return get<PaginatedData<InventorySku>>("/admin/inventory/skus", params as unknown as Record<string, unknown>);
}

export function adjustInventorySkuStock(
  variantId: string,
  data: { change_type: Extract<InventoryChangeType, "in" | "out" | "adjust">; quantity: number; reason?: string; remark?: string; source_no?: string; cost_price?: number },
) {
  return post<{ product_id: string; variant_id: string; before_stock: number; after_stock: number; quantity_delta: number }>(`/admin/inventory/skus/${variantId}/adjust`, data);
}

export function updateInventorySkuWarningThreshold(variantId: string, stock_warning_threshold: number) {
  return patch<void>(`/admin/inventory/skus/${variantId}/warning-threshold`, { stock_warning_threshold });
}

export function batchUpdateInventoryWarningThreshold(variant_ids: string[], stock_warning_threshold: number) {
  return post<{ updated: number }>("/admin/inventory/batch-warning-threshold", { variant_ids, stock_warning_threshold });
}

export function batchAdjustInventory(items: Array<{ variant_id: string; change_type: "in" | "out" | "adjust"; quantity: number; reason: string; remark?: string; source_no?: string; cost_price?: number }>) {
  return post<{ updated: number }>("/admin/inventory/batch-adjust", { items });
}

export function getInventoryRecords(params?: {
  page?: number;
  pageSize?: number;
  product_id?: string;
  variant_id?: string;
  change_type?: string;
  keyword?: string;
  source_no?: string;
  order_no?: string;
  operator_id?: string;
  date_from?: string;
  date_to?: string;
}) {
  return get<PaginatedData<InventoryStockRecord>>("/admin/inventory/records", params as unknown as Record<string, unknown>);
}

export function getReplenishmentAlerts(params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  variant_id?: string;
}) {
  return get<PaginatedData<InventoryReplenishmentAlert>>("/admin/inventory/replenishment-alerts", params as unknown as Record<string, unknown>);
}

export function generateReplenishmentAlerts() {
  return post<{ created: number; updated: number; scanned: number }>("/admin/inventory/replenishment-alerts/generate", {});
}

export function createPurchaseOrderFromAlert(
  alertId: string,
  data: { ordered_qty?: number; unit_cost?: number; expected_arrival_date?: string; remark?: string },
) {
  return post<{ id: string; order_no: string; item_id: string; ordered_qty: number }>(`/admin/inventory/replenishment-alerts/${alertId}/create-purchase-order`, data);
}

export function createSmartReplenishmentPreview(data: {
  variant_ids?: string[];
  analysis_days?: number;
  strategy?: "conservative" | "balanced" | "aggressive" | string;
  lead_time_days?: number;
  safety_stock_days?: number;
  target_cover_days?: number;
  min_floor_stock?: number;
  purchase_multiple?: number;
}) {
  return post<SmartReplenishmentPreviewResult>("/admin/inventory/replenishment-runs/preview", data);
}

export function applySmartReplenishmentRun(
  id: string,
  data: { items?: Array<{ id: string; suggested_lower_limit?: number; suggested_upper_limit?: number; suggested_replenishment_qty?: number }> } = {},
) {
  return post<{ id: string; applied: number }>(`/admin/inventory/replenishment-runs/${id}/apply`, data);
}

export function generateDailyInventorySnapshot(data: { snapshot_date?: string } = {}) {
  return post<{ snapshot_date: string; affected_rows: number }>("/admin/inventory/daily-snapshots/generate", data);
}

export function getPurchaseOrders(params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
}) {
  return get<PaginatedData<PurchaseOrder>>("/admin/purchase-orders", params as unknown as Record<string, unknown>);
}

export function getPurchaseOrder(id: string) {
  return get<PurchaseOrderDetail>(`/admin/purchase-orders/${id}`);
}

export function receivePurchaseOrder(
  id: string,
  data: { actual_arrival_date?: string; remark?: string; items?: Array<{ id: string; received_qty: number; unit_cost?: number }> } = {},
) {
  return post<{ received_qty: number; status: string }>(`/admin/purchase-orders/${id}/receive`, data);
}

export function getInventoryPackRules(params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  parent_variant_id?: string;
  child_variant_id?: string;
  enabled?: boolean | string;
  auto_unpack_enabled?: boolean | string;
}) {
  return get<PaginatedData<InventoryPackRule>>("/admin/inventory/pack-rules", params as unknown as Record<string, unknown>);
}

export function createInventoryPackRule(data: Partial<InventoryPackRule>) {
  return post<InventoryPackRule>("/admin/inventory/pack-rules", data);
}

export function updateInventoryPackRule(id: string, data: Partial<InventoryPackRule>) {
  return patch<InventoryPackRule>(`/admin/inventory/pack-rules/${id}`, data);
}

export function deleteInventoryPackRule(id: string) {
  return del<void>(`/admin/inventory/pack-rules/${id}`);
}

export function unpackInventoryRule(data: { rule_id: string; parent_qty: number; remark?: string }) {
  return post<InventoryConversionOrder>("/admin/inventory/conversions/unpack", data);
}

export function assembleInventoryRule(data: { rule_id: string; parent_qty: number; remark?: string }) {
  return post<InventoryConversionOrder>("/admin/inventory/conversions/assemble", data);
}

export function getInventoryConversions(params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  type?: string;
  order_no?: string;
  source_order_no?: string;
  parent_variant_id?: string;
  child_variant_id?: string;
  operator_id?: string;
  date_from?: string;
  date_to?: string;
}) {
  return get<PaginatedData<InventoryConversionOrder>>("/admin/inventory/conversions", params as unknown as Record<string, unknown>);
}

export function getInventoryConversion(id: string) {
  return get<InventoryConversionOrder>(`/admin/inventory/conversions/${id}`);
}

export function exportInventorySkusCsv(params?: Record<string, unknown>) {
  const qs = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)])).toString();
  return downloadAdminCsv(`/admin/inventory/export${qs ? `?${qs}` : ""}`, `inventory_skus_${Date.now()}.csv`);
}

export function exportInventoryRecordsCsv(params?: Record<string, unknown>) {
  const qs = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)])).toString();
  return downloadAdminCsv(`/admin/inventory/records/export${qs ? `?${qs}` : ""}`, `inventory_records_${Date.now()}.csv`);
}
