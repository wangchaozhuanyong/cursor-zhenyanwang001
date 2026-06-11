import { del, get, patch, post } from "@/api/request";
import type { HotSearchTerm } from "@/types/search";
import type { PaginatedData } from "@/types/common";

export type AdminSearchTermQuery = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  source?: "auto" | "manual" | "";
  visibility?: "visible" | "hidden" | "";
  pinned?: "1" | "";
};

export type AdminSearchTermPayload = {
  keyword?: string;
  result_count?: number;
  is_pinned?: boolean;
  is_hidden?: boolean;
  sort_order?: number;
  remark?: string;
};

export function getAdminSearchTerms(params?: AdminSearchTermQuery) {
  return get<PaginatedData<HotSearchTerm>>("/admin/search-terms", params as unknown as Record<string, unknown>);
}

export function createAdminSearchTerm(payload: Required<Pick<AdminSearchTermPayload, "keyword">> & AdminSearchTermPayload) {
  return post<HotSearchTerm>("/admin/search-terms", payload);
}

export function updateAdminSearchTerm(id: string, payload: AdminSearchTermPayload) {
  return patch<HotSearchTerm>(`/admin/search-terms/${id}`, payload);
}

export function deleteAdminSearchTerm(id: string) {
  return del<{ ok: boolean }>(`/admin/search-terms/${id}`);
}
