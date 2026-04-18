import * as returnApi from "@/api/admin/return";
import type { ReturnRequest } from "@/types/return";
import type { PaginatedData, PaginationParams } from "@/types/common";
import { unwrapPaginated } from "@/services/responseNormalize";

export async function fetchReturnRequests(params?: PaginationParams & { status?: string }): Promise<PaginatedData<ReturnRequest>> {
  const res = await returnApi.getReturnRequests(params);
  return unwrapPaginated<ReturnRequest>(res.data);
}

export async function fetchReturnById(id: string) {
  const res = await returnApi.getReturnById(id);
  return res.data;
}

export async function approveReturn(id: string, remark?: string) {
  const res = await returnApi.approveReturn(id, remark);
  return res.data;
}

export async function rejectReturn(id: string, remark: string) {
  const res = await returnApi.rejectReturn(id, remark);
  return res.data;
}
