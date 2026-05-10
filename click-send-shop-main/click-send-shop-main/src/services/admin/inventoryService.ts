import * as inventoryApi from "@/api/admin/inventory";
import type { InventoryChangeType, InventoryProduct, InventoryStockRecord } from "@/types/inventory";
import type { PaginatedData } from "@/types/common";
import { unwrapPaginated } from "@/services/responseNormalize";

export async function fetchInventoryProducts(params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  lowStock?: boolean;
}): Promise<PaginatedData<InventoryProduct>> {
  const res = await inventoryApi.getInventoryProducts(params);
  return unwrapPaginated<InventoryProduct>(res.data);
}

export async function adjustInventoryStock(
  productId: string,
  data: { change_type: Extract<InventoryChangeType, "in" | "out" | "adjust">; quantity: number; reason?: string },
) {
  const res = await inventoryApi.adjustInventoryStock(productId, data);
  return res.data;
}

export async function updateInventoryWarningThreshold(productId: string, threshold: number) {
  await inventoryApi.updateInventoryWarningThreshold(productId, threshold);
}

export async function fetchInventoryRecords(params?: {
  page?: number;
  pageSize?: number;
  product_id?: string;
  change_type?: string;
}): Promise<PaginatedData<InventoryStockRecord>> {
  const res = await inventoryApi.getInventoryRecords(params);
  return unwrapPaginated<InventoryStockRecord>(res.data);
}
