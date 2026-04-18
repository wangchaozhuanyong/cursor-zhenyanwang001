import * as inviteApi from "@/api/admin/invite";
import type { InviteRecord, ReferralRule } from "@/types/invite";
import type { PaginatedData, PaginationParams } from "@/types/common";
import { unwrapList, unwrapPaginated } from "@/services/responseNormalize";

export async function fetchInviteRecords(params?: PaginationParams): Promise<PaginatedData<InviteRecord>> {
  const res = await inviteApi.getInviteRecords(params);
  return unwrapPaginated<InviteRecord>(res.data);
}

export async function fetchReferralRules(): Promise<ReferralRule[]> {
  const res = await inviteApi.getReferralRules();
  return unwrapList<ReferralRule>(res.data);
}

export async function updateReferralRule(id: string, data: Partial<ReferralRule>) {
  const res = await inviteApi.updateReferralRule(id, data);
  return res.data;
}
