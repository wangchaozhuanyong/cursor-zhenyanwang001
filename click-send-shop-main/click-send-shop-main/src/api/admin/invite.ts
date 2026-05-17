import { get, put } from "@/api/request";
import type { InviteRecord, ReferralRule } from "@/types/invite";
import type { PaginatedData, PaginationParams } from "@/types/common";

export function getInviteRecords(params?: PaginationParams & { keyword?: string; dateFrom?: string; dateTo?: string }) {
  return get<PaginatedData<InviteRecord> & { summary?: Record<string, number> }>("/admin/invites", params as unknown as Record<string, string>);
}

export function getReferralRules() {
  return get<ReferralRule[]>("/admin/referral-rules");
}

export function updateReferralRule(id: string, data: Partial<ReferralRule>) {
  return put<ReferralRule>(`/admin/referral-rules/${id}`, data);
}
