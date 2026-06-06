import { get, put, post } from "@/api/request";
import type { PaginatedData } from "@/types/common";

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
  can_permanent_delete?: boolean | number;
}

export interface RecycleBinListParams {
  type?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export function getRecycleBin(params?: RecycleBinListParams) {
  return get<RecycleBinItem[] | PaginatedData<RecycleBinItem>>("/admin/recycle-bin", params as unknown as Record<string, unknown>);
}

export function restoreItem(id: string, type: string) {
  return put<void>(`/admin/recycle-bin/${id}/restore`, { type });
}

export function permanentDeleteItem(id: string, type: string) {
  return post<void>(`/admin/recycle-bin/${id}/permanent-delete`, { type });
}
