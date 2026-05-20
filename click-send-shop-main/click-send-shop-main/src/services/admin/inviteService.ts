import * as inviteApi from "@/api/admin/invite";
import type { InviteRecord, ReferralRule } from "@/types/invite";
import type { PaginatedData, PaginationParams } from "@/types/common";
import { unwrapList, unwrapPaginated } from "@/services/responseNormalize";

export async function fetchInviteRecords(params?: PaginationParams & { keyword?: string; dateFrom?: string; dateTo?: string }): Promise<PaginatedData<InviteRecord> & { summary?: Record<string, number> }> {
  const res = await inviteApi.getInviteRecords(params);
  const base = unwrapPaginated<InviteRecord>(res.data);
  return { ...base, summary: (res.data as any)?.summary || {} };
}

export async function fetchReferralRules(): Promise<ReferralRule[]> {
  const res = await inviteApi.getReferralRules();
  return unwrapList<ReferralRule>(res.data);
}

export async function updateReferralRule(id: string, data: Partial<ReferralRule>) {
  const res = await inviteApi.updateReferralRule(id, data);
  return res.data;
}
