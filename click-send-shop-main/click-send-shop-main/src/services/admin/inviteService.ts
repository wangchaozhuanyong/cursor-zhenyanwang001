import * as inviteApi from "@/api/admin/invite";
import type { InviteRecord, InviteRecordsSummary, ReferralRule } from "@/types/invite";
import type { PaginatedData, PaginationParams } from "@/types/common";
import { unwrapList, unwrapPaginated } from "@/services/responseNormalize";

export async function fetchInviteRecords(params?: PaginationParams & { keyword?: string; dateFrom?: string; dateTo?: string }): Promise<PaginatedData<InviteRecord> & { summary?: InviteRecordsSummary }> {
  const res = await inviteApi.getInviteRecords(params);
  const base = unwrapPaginated<InviteRecord>(res.data);
  const raw = res.data as PaginatedData<InviteRecord> & { summary?: InviteRecordsSummary };
  return { ...base, summary: raw.summary || {} };
}

export async function fetchReferralRules(): Promise<ReferralRule[]> {
  const res = await inviteApi.getReferralRules();
  return unwrapList<ReferralRule>(res.data);
}

export async function updateReferralRule(id: string, data: Partial<ReferralRule>) {
  const res = await inviteApi.updateReferralRule(id, data);
  return res.data;
}
