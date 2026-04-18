import { get, post } from "../request";
import type { PointsRecord, PointsListParams } from "@/types/points";
import type { PaginatedData } from "@/types/common";

export function getPointsRecords(params?: PointsListParams) {
  return get<PaginatedData<PointsRecord>>("/points/records", params as Record<string, string>);
}

export function getPointsBalance() {
  return get<{ balance: number }>("/points/balance");
}

export function signIn() {
  return post<PointsRecord>("/points/sign-in");
}
