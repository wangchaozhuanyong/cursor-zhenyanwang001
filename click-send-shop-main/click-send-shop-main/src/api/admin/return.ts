import { get, put } from "../request";
import type { ReturnRequest } from "@/types/return";
import type { PaginatedData, PaginationParams } from "@/types/common";

export function getReturnRequests(params?: PaginationParams & { status?: string; keyword?: string; dateFrom?: string; dateTo?: string; sortBy?: string; sortOrder?: string }) {
  return get<PaginatedData<ReturnRequest>>("/admin/returns", params as Record<string, string>);
}

export function getReturnById(id: string) {
  return get<ReturnRequest>(`/admin/returns/${id}`);
}

export function approveReturn(id: string, remark?: string) {
  return put<ReturnRequest>(`/admin/returns/${id}/approve`, { remark });
}

export function rejectReturn(id: string, remark: string) {
  return put<ReturnRequest>(`/admin/returns/${id}/reject`, { remark });
}
