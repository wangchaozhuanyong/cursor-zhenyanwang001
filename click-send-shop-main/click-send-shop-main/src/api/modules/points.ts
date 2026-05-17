import { get, post } from "@/api/request";
import type { PointsRecord, PointsListParams } from "@/types/points";
import type { PaginatedData } from "@/types/common";

export function getPointsRecords(params?: PointsListParams) {
  return get<PaginatedData<PointsRecord>>("/points/records", params as unknown as Record<string, string>);
}

export function getPointsBalance() {
  return get<{ balance: number }>("/points/balance");
}

export type PointsClientConfig = {
  signIn: {
    points: number;
    enabled: boolean;
    usesDefault: boolean;
    disabledReason?: string | null;
  };
  orderPointsHint: string;
};

export function getPointsConfig() {
  return get<PointsClientConfig>("/points/config");
}

export function signIn() {
  return post<{ points: number }>("/points/sign-in");
}

