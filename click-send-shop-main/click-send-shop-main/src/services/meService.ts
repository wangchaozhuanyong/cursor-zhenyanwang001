import * as meApi from "@/api/modules/me";

export type MeSummary = meApi.MeSummaryResponse;

export async function fetchMeSummary(): Promise<MeSummary> {
  const res = await meApi.getMeSummary();
  return res.data;
}
