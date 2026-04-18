import { get, put, post } from "../request";

export interface RecycleBinItem {
  id: string;
  name: string;
  type: string;
  type_label: string;
  cover_image?: string;
  slug?: string;
  product_id?: string;
  deleted_at: string;
  deleted_by: string | null;
}

export function getRecycleBin(params?: { type?: string }) {
  return get<RecycleBinItem[]>("/admin/recycle-bin", params as Record<string, unknown>);
}

export function restoreItem(id: string, type: string) {
  return put<void>(`/admin/recycle-bin/${id}/restore`, { type });
}

export function permanentDeleteItem(id: string, type: string) {
  return post<void>(`/admin/recycle-bin/${id}/permanent-delete`, { type });
}
