import * as recycleBinApi from "@/api/admin/recycleBin";
import type { RecycleBinItem } from "@/api/admin/recycleBin";
import { unwrapList } from "@/services/responseNormalize";

export type { RecycleBinItem };

export async function loadRecycleBin(params?: { type?: string }) {
  const res = await recycleBinApi.getRecycleBin(params);
  return unwrapList<RecycleBinItem>(res.data);
}

export async function restoreRecycleBinItem(id: string, type: string) {
  const res = await recycleBinApi.restoreItem(id, type);
  return res.data;
}

export async function permanentlyDeleteRecycleBinItem(id: string, type: string) {
  const res = await recycleBinApi.permanentDeleteItem(id, type);
  return res.data;
}
