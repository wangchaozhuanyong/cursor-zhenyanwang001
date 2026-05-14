import { get, post, put } from "@/api/request";
import type { PaginatedData } from "@/types/common";
import type { InventoryChangeType, InventoryProduct, InventoryStockRecord } from "@/types/inventory";

export function getInventoryProducts(params?: { page?: number; pageSize?: number; keyword?: string; lowStock?: boolean }) {
  return get<PaginatedData<InventoryProduct>>("/admin/inventory/products", params as Record<string, unknown>);
}

export function adjustInventoryStock(
  productId: string,
  data: { change_type: Extract<InventoryChangeType, "in" | "out" | "adjust">; quantity: number; reason?: string },
) {
  return post<{ product_id: string; before_stock: number; after_stock: number; quantity_delta: number }>(
    `/admin/inventory/products/${productId}/adjust`,
    data,
  );
}

export function updateInventoryWarningThreshold(productId: string, stock_warning_threshold: number) {
  return put<void>(`/admin/inventory/products/${productId}/warning-threshold`, { stock_warning_threshold });
}

export function getInventoryRecords(params?: { page?: number; pageSize?: number; product_id?: string; change_type?: string }) {
  return get<PaginatedData<InventoryStockRecord>>("/admin/inventory/records", params as Record<string, unknown>);
}

