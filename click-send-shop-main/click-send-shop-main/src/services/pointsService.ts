import * as pointsApi from "@/api/modules/points";
import type { PointsClientConfig } from "@/api/modules/points";
import type { PointsRecord, PointsListParams } from "@/types/points";
import type { PaginatedData } from "@/types/common";

export async function fetchPointsRecords(
  params?: PointsListParams,
): Promise<PaginatedData<PointsRecord>> {
  const res = await pointsApi.getPointsRecords(params);
  return res.data;
}

export async function fetchPointsBalance(): Promise<number> {
  const res = await pointsApi.getPointsBalance();
  return (res.data as { balance: number }).balance;
}

export async function fetchPointsConfig(): Promise<PointsClientConfig> {
  const res = await pointsApi.getPointsConfig();
  return res.data as PointsClientConfig;
}

export async function signIn(): Promise<number> {
  const res = await pointsApi.signIn();
  return (res.data as { points: number }).points;
}
