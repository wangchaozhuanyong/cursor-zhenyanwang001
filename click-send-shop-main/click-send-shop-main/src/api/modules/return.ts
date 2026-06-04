import { get, patch, post } from "@/api/request";
import type {
  CancelReturnParams,
  CreateReturnParams,
  ReturnEvidenceParams,
  ReturnLogisticsParams,
  ReturnRequest,
  ReturnListParams,
} from "@/types/return";
import type { PaginatedData } from "@/types/common";

export function getReturnRequests(params?: ReturnListParams) {
  return get<PaginatedData<ReturnRequest>>("/returns", params as unknown as Record<string, string>);
}

export function getReturnById(id: string) {
  return get<ReturnRequest>(`/returns/${id}`);
}

export function createReturnRequest(params: CreateReturnParams) {
  return post<ReturnRequest>("/returns", params);
}

export function cancelReturnRequest(id: string, params?: CancelReturnParams) {
  return patch<ReturnRequest>(`/returns/${id}/cancel`, params || {});
}

export function supplementReturnEvidence(id: string, params: ReturnEvidenceParams) {
  return post<ReturnRequest>(`/returns/${id}/evidence`, params);
}

export function submitReturnLogistics(id: string, params: ReturnLogisticsParams) {
  return post<ReturnRequest>(`/returns/${id}/logistics`, params);
}

export function confirmReturnCompleted(id: string) {
  return post<ReturnRequest>(`/returns/${id}/confirm`, {});
}
