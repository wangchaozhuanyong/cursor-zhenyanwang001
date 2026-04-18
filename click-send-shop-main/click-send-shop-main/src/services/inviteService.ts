import * as inviteApi from "@/api/modules/invite";
import type { InviteStats, InviteRecord } from "@/types/invite";
import type { PaginatedData } from "@/types/common";
import { unwrapPaginated } from "@/services/responseNormalize";

export async function fetchInviteStats(): Promise<InviteStats> {
  const res = await inviteApi.getInviteStats();
  return res.data;
}

export async function fetchInviteRecords(page = 1): Promise<PaginatedData<InviteRecord>> {
  const res = await inviteApi.getInviteRecords(page);
  return unwrapPaginated<InviteRecord>(res.data);
}

export async function bindInviteCode(code: string): Promise<void> {
  await inviteApi.bindInviteCode(code);
}
