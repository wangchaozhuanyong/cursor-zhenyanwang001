import * as api from "@/api/admin/searchTerms";
import type { HotSearchTerm } from "@/types/search";
import type { PaginatedData } from "@/types/common";

export type AdminSearchTermQuery = api.AdminSearchTermQuery;
export type AdminSearchTermPayload = api.AdminSearchTermPayload;

export async function fetchAdminSearchTerms(params?: AdminSearchTermQuery): Promise<PaginatedData<HotSearchTerm>> {
  const res = await api.getAdminSearchTerms(params);
  return res.data;
}

export async function createAdminSearchTerm(payload: Required<Pick<AdminSearchTermPayload, "keyword">> & AdminSearchTermPayload): Promise<HotSearchTerm> {
  const res = await api.createAdminSearchTerm(payload);
  return res.data;
}

export async function updateAdminSearchTerm(id: string, payload: AdminSearchTermPayload): Promise<HotSearchTerm> {
  const res = await api.updateAdminSearchTerm(id, payload);
  return res.data;
}

export async function deleteAdminSearchTerm(id: string): Promise<{ ok: boolean }> {
  const res = await api.deleteAdminSearchTerm(id);
  return res.data;
}
