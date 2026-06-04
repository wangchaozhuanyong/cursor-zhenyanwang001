import * as returnApi from "@/api/modules/return";
import type {
  CancelReturnParams,
  CreateReturnParams,
  ReturnEvidenceParams,
  ReturnLogisticsParams,
  ReturnRequest,
  ReturnListParams,
} from "@/types/return";
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

export async function cancelReturn(id: string, params?: CancelReturnParams): Promise<ReturnRequest> {
  const res = await returnApi.cancelReturnRequest(id, params);
  return res.data;
}

export async function supplementEvidence(id: string, params: ReturnEvidenceParams): Promise<ReturnRequest> {
  const res = await returnApi.supplementReturnEvidence(id, params);
  return res.data;
}

export async function submitLogistics(id: string, params: ReturnLogisticsParams): Promise<ReturnRequest> {
  const res = await returnApi.submitReturnLogistics(id, params);
  return res.data;
}

export async function confirmCompleted(id: string): Promise<ReturnRequest> {
  const res = await returnApi.confirmReturnCompleted(id);
  return res.data;
}
