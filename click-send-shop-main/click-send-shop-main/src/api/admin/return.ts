import { get, put } from "@/api/request";
import type { ApproveReturnParams, ReturnRequest } from "@/types/return";
import type { PaginatedData, PaginationParams } from "@/types/common";

export function getReturnRequests(
  params?: PaginationParams & {
    status?: string;
    keyword?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
  },
) {
  return get<PaginatedData<ReturnRequest>>("/admin/returns", params as Record<string, string>);
}

export function getReturnById(id: string) {
  return get<ReturnRequest>(`/admin/returns/${id}`);
}

export function approveReturn(id: string, payload: ApproveReturnParams) {
  return put<ReturnRequest>(`/admin/returns/${id}/approve`, payload);
}

export function rejectReturn(id: string, adminRemark: string) {
  return put<ReturnRequest>(`/admin/returns/${id}/reject`, { admin_remark: adminRemark });
}
