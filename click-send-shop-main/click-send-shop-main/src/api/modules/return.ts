import { get, post } from "../request";
import type { ReturnRequest, CreateReturnParams, ReturnListParams } from "@/types/return";
import type { PaginatedData } from "@/types/common";

export function getReturnRequests(params?: ReturnListParams) {
  return get<PaginatedData<ReturnRequest>>("/returns", params as Record<string, string>);
}

export function getReturnById(id: string) {
  return get<ReturnRequest>(`/returns/${id}`);
}

export function createReturnRequest(params: CreateReturnParams) {
  return post<ReturnRequest>("/returns", params);
}
