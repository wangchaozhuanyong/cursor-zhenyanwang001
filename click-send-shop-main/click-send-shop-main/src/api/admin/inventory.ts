import { get, patch, post } from "@/api/request";
import type { PaginatedData } from "@/types/common";
import type { InventoryChangeType, InventoryConversionOrder, InventoryPackRule, InventorySku, InventoryStockRecord, InventorySummary } from "@/types/inventory";
import { getAdminAccessToken } from "@/utils/token";

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
  return fetch((import.meta.env.VITE_API_BASE_URL ?? "/api") + `/admin/inventory/pack-rules/${id}`, {
    method: "DELETE",
    headers: getAdminAccessToken() ? { Authorization: `Bearer ${getAdminAccessToken()}` } : undefined,
    credentials: "include",
  }).then((res) => {
    if (!res.ok) throw new Error("删除失败");
    return res.json();
  });
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

async function downloadCsv(url: string, filename: string) {
  const token = getAdminAccessToken();
  const res = await fetch((import.meta.env.VITE_API_BASE_URL ?? "/api") + url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) throw new Error("导出失败");
  const text = await res.text();
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportInventorySkusCsv(params?: Record<string, unknown>) {
  const qs = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)])).toString();
  return downloadCsv(`/admin/inventory/export${qs ? `?${qs}` : ""}`, `inventory_skus_${Date.now()}.csv`);
}

export function exportInventoryRecordsCsv(params?: Record<string, unknown>) {
  const qs = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)])).toString();
  return downloadCsv(`/admin/inventory/records/export${qs ? `?${qs}` : ""}`, `inventory_records_${Date.now()}.csv`);
}

