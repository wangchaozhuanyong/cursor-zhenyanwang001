import { get, put } from "@/api/request";
import type { ApproveReturnParams, ReturnListParams, ReturnRequest } from "@/types/return";
import type { PaginatedData } from "@/types/common";

export function getReturnRequests(params?: ReturnListParams) {
  return get<PaginatedData<ReturnRequest>>("/admin/returns", params as unknown as Record<string, string>);
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
