import * as inventoryApi from "@/api/admin/inventory";
import type { InventoryChangeType, InventoryConversionOrder, InventoryPackRule, InventorySku, InventoryStockRecord, InventorySummary } from "@/types/inventory";
import type { PaginatedData } from "@/types/common";
import { unwrapPaginated } from "@/services/responseNormalize";

export async function fetchInventorySummary(): Promise<InventorySummary> {
  const res = await inventoryApi.getInventorySummary();
  return res.data;
}

export async function fetchInventorySkus(params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category_id?: string;
  lifecycle_status?: string | number;
  stock_status?: "normal" | "low" | "out";
  lowStock?: boolean;
  sku_code?: string;
  sort?: string;
}): Promise<PaginatedData<InventorySku>> {
  const res = await inventoryApi.getInventorySkus(params);
  return unwrapPaginated<InventorySku>(res.data);
}

export async function adjustInventorySkuStock(
  variantId: string,
  data: { change_type: Extract<InventoryChangeType, "in" | "out" | "adjust">; quantity: number; reason?: string; remark?: string; source_no?: string; cost_price?: number },
) {
  const res = await inventoryApi.adjustInventorySkuStock(variantId, data);
  return res.data;
}

export async function updateInventorySkuWarningThreshold(variantId: string, threshold: number) {
  await inventoryApi.updateInventorySkuWarningThreshold(variantId, threshold);
}

export async function batchUpdateInventoryWarningThreshold(variantIds: string[], threshold: number) {
  const res = await inventoryApi.batchUpdateInventoryWarningThreshold(variantIds, threshold);
  return res.data;
}

export async function fetchInventoryRecords(params?: {
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
}): Promise<PaginatedData<InventoryStockRecord>> {
  const res = await inventoryApi.getInventoryRecords(params);
  return unwrapPaginated<InventoryStockRecord>(res.data);
}

export async function fetchInventoryPackRules(params?: Parameters<typeof inventoryApi.getInventoryPackRules>[0]): Promise<PaginatedData<InventoryPackRule>> {
  const res = await inventoryApi.getInventoryPackRules(params);
  return unwrapPaginated<InventoryPackRule>(res.data);
}

export async function createInventoryPackRule(data: Partial<InventoryPackRule>) {
  const res = await inventoryApi.createInventoryPackRule(data);
  return res.data;
}

export async function updateInventoryPackRule(id: string, data: Partial<InventoryPackRule>) {
  const res = await inventoryApi.updateInventoryPackRule(id, data);
  return res.data;
}

export async function deleteInventoryPackRule(id: string) {
  await inventoryApi.deleteInventoryPackRule(id);
}

export async function unpackInventoryRule(data: { rule_id: string; parent_qty: number; remark?: string }) {
  const res = await inventoryApi.unpackInventoryRule(data);
  return res.data;
}

export async function assembleInventoryRule(data: { rule_id: string; parent_qty: number; remark?: string }) {
  const res = await inventoryApi.assembleInventoryRule(data);
  return res.data;
}

export async function fetchInventoryConversions(params?: Parameters<typeof inventoryApi.getInventoryConversions>[0]): Promise<PaginatedData<InventoryConversionOrder>> {
  const res = await inventoryApi.getInventoryConversions(params);
  return unwrapPaginated<InventoryConversionOrder>(res.data);
}

export const exportInventorySkusCsv = inventoryApi.exportInventorySkusCsv;
export const exportInventoryRecordsCsv = inventoryApi.exportInventoryRecordsCsv;

