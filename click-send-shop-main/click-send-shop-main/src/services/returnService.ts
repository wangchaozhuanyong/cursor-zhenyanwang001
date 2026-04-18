import * as returnApi from "@/api/modules/return";
import type { ReturnRequest, ReturnListParams, CreateReturnParams } from "@/types/return";
import type { PaginatedData } from "@/types/common";
import { unwrapPaginated } from "@/services/responseNormalize";

export async function fetchReturnRequests(
  params?: ReturnListParams,
): Promise<PaginatedData<ReturnRequest>> {
  const res = await returnApi.getReturnRequests(params);
  return unwrapPaginated<ReturnRequest>(res.data);
}

export async function createReturn(params: CreateReturnParams): Promise<ReturnRequest> {
  const res = await returnApi.createReturnRequest(params);
  return res.data;
}
