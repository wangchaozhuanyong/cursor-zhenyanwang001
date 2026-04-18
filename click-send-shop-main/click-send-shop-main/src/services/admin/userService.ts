import * as userApi from "@/api/admin/user";
import type { PaginatedData, PaginationParams } from "@/types/common";
import type { UserProfile } from "@/types/user";
import { downloadAdminCsv } from "@/utils/adminCsvDownload";
import { unwrapPaginated } from "@/services/responseNormalize";

export async function fetchUsers(params?: PaginationParams & { keyword?: string }): Promise<PaginatedData<UserProfile>> {
  const res = await userApi.getUsers(params);
  return unwrapPaginated<UserProfile>(res.data);
}

export async function fetchUserById(id: string) {
  const res = await userApi.getUserById(id);
  return res.data;
}

export async function toggleSubordinate(id: string, enabled: boolean) {
  await userApi.toggleSubordinate(id, enabled);
}

export async function adjustUserPoints(userId: string, points: number, reason?: string) {
  await userApi.adjustUserPoints(userId, points, reason);
}

export async function exportUsersCsv(params?: { keyword?: string }) {
  const qs = new URLSearchParams();
  if (params?.keyword) qs.set("keyword", params.keyword);
  const q = qs.toString();
  await downloadAdminCsv(`/admin/users/export${q ? `?${q}` : ""}`, "users.csv");
}
