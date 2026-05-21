import * as recycleBinApi from "@/api/admin/recycleBin";
import type { RecycleBinItem, RecycleBinListParams } from "@/api/admin/recycleBin";
import { unwrapPaginated } from "@/services/responseNormalize";

export type { RecycleBinItem };

export async function loadRecycleBin(params?: RecycleBinListParams) {
  const res = await recycleBinApi.getRecycleBin(params);
  return unwrapPaginated<RecycleBinItem>(res.data);
}

export async function restoreRecycleBinItem(id: string, type: string) {
  const res = await recycleBinApi.restoreItem(id, type);
  return res.data;
}

export async function permanentlyDeleteRecycleBinItem(id: string, type: string) {
  const res = await recycleBinApi.permanentDeleteItem(id, type);
  return res.data;
}
