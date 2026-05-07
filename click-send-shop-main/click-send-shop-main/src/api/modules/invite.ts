import { get } from "../request";
import type { InviteRecord, InviteStats } from "@/types/invite";
import type { PaginatedData } from "@/types/common";

export function getInviteRecords(page = 1) {
  return get<PaginatedData<InviteRecord>>("/invite/records", {
    page: String(page),
  });
}

export function getInviteStats() {
  return get<InviteStats>("/invite/stats");
}

