import * as returnApi from "@/api/modules/return";
import type { ReturnRequest, ReturnListParams, CreateReturnParams } from "@/types/return";
import type { PaginatedData } from "@/types/common";
import { unwrapPaginated } from "@/services/responseNormalize";
import { trackRefundRequested } from "@/utils/tracking";

export async function fetchReturnRequests(
  params?: ReturnListParams,
): Promise<PaginatedData<ReturnRequest>> {
  const res = await returnApi.getReturnRequests(params);
  return unwrapPaginated<ReturnRequest>(res.data);
}

export async function createReturn(params: CreateReturnParams): Promise<ReturnRequest> {
  const res = await returnApi.createReturnRequest(params);
  trackRefundRequested({
    order_id: params.order_id,
    order_item_id: params.order_item_id,
  });
  return res.data;
}

export async function fetchReturnById(id: string): Promise<ReturnRequest> {
  const res = await returnApi.getReturnById(id);
  return res.data;
}
