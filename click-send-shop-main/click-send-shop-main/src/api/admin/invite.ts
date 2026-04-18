import { get, put } from "../request";
import type { InviteRecord, ReferralRule } from "@/types/invite";
import type { PaginatedData, PaginationParams } from "@/types/common";

export function getInviteRecords(params?: PaginationParams) {
  return get<PaginatedData<InviteRecord>>("/admin/invites", params as Record<string, string>);
}

export function getReferralRules() {
  return get<ReferralRule[]>("/admin/referral-rules");
}

export function updateReferralRule(id: string, data: Partial<ReferralRule>) {
  return put<ReferralRule>(`/admin/referral-rules/${id}`, data);
}
