import * as returnApi from "@/api/admin/return";
import type { ApproveReturnParams, ReturnDetail, ReturnListParams, ReturnRequest } from "@/types/return";
import type { PaginatedData } from "@/types/common";
import { unwrapPaginated } from "@/services/responseNormalize";

export async function fetchReturnRequests(params?: ReturnListParams): Promise<PaginatedData<ReturnRequest>> {
  const res = await returnApi.getReturnRequests(params);
  return unwrapPaginated<ReturnRequest>(res.data);
}

export async function fetchReturnById(id: string): Promise<ReturnDetail> {
  const res = await returnApi.getReturnById(id);
  return res.data as ReturnDetail;
}

export async function approveReturn(id: string, payload: ApproveReturnParams) {
  const res = await returnApi.approveReturn(id, payload);
  return res.data;
}

export async function rejectReturn(id: string, remark: string) {
  const res = await returnApi.rejectReturn(id, remark);
  return res.data;
}
