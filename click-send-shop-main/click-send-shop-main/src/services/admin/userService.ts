import * as userApi from "@/api/admin/user";
import type { MemberLevelPayload } from "@/api/admin/user";
import type { PaginatedData } from "@/types/common";
import type { MemberLevel, UserProfile, UserTag } from "@/types/user";
import { downloadAdminCsv } from "@/utils/adminCsvDownload";
import { unwrapList, unwrapPaginated } from "@/services/responseNormalize";

export type UserListQuery = Parameters<typeof userApi.getUsers>[0];

export async function fetchUsers(params?: UserListQuery): Promise<PaginatedData<UserProfile> & { summary?: Record<string, number> }> {
  const res = await userApi.getUsers(params);
  const base = unwrapPaginated<UserProfile>(res.data);
  return { ...base, summary: (res.data as any)?.summary || {} };
}

export async function fetchUserById(id: string, options?: { signal?: AbortSignal }) {
  const res = await userApi.getUserById(id, options);
  return res.data;
}

export async function unbindUserWechat(id: string) {
  await userApi.unbindUserWechat(id);
}

export async function updateUserProfile(id: string, data: Partial<UserProfile>) {
  await userApi.updateUser(id, data);
}

export async function updateUserStatus(id: string, accountStatus: string) {
  await userApi.updateUserStatus(id, accountStatus);
}

export async function resetUserPassword(id: string): Promise<string> {
  const res = await userApi.resetUserPassword(id);
  return (res.data as any)?.password || "";
}

export async function toggleSubordinate(id: string, enabled: boolean) {
  await userApi.toggleSubordinate(id, enabled);
}

export async function fetchUserTags(): Promise<UserTag[]> {
  const res = await userApi.getUserTags();
  return unwrapList<UserTag>(res.data);
}

export async function createUserTag(data: Pick<UserTag, "name"> & Partial<Pick<UserTag, "color" | "description" | "sort_order">>) {
  const res = await userApi.createUserTag(data);
  return res.data;
}

export async function updateUserTag(id: string, data: Partial<UserTag>) {
  await userApi.updateUserTag(id, data);
}

export async function deleteUserTag(id: string) {
  await userApi.deleteUserTag(id);
}
export async function fetchUserTagImpact(id: string): Promise<number> {
  const res = await userApi.getUserTagImpact(id);
  return Number((res.data as any)?.affectedUsers || 0);
}

export async function setUserTags(id: string, tagIds: string[]) {
  const res = await userApi.setUserTags(id, tagIds);
  return unwrapList<UserTag>(res.data);
}

export async function batchSetUserTag(tagId: string, userIds: string[]) {
  const res = await userApi.batchSetUserTag(tagId, userIds);
  return Number((res.data as any)?.affected || 0);
}

export async function adjustUserPoints(userId: string, points: number, reason?: string) {
  await userApi.adjustUserPoints(userId, points, reason);
}

export async function fetchMemberLevels(): Promise<MemberLevel[]> {
  const res = await userApi.getMemberLevels();
  return unwrapList<MemberLevel>(res.data);
}

export async function createMemberLevel(data: MemberLevelPayload) {
  await userApi.createMemberLevel(data);
}

export async function updateMemberLevel(id: string, data: MemberLevelPayload) {
  await userApi.updateMemberLevel(id, data);
}

export async function deleteMemberLevel(id: string) {
  await userApi.deleteMemberLevel(id);
}

export async function recalculateAllMemberLevels() {
  const res = await userApi.recalculateAllMemberLevels();
  return res.data as any;
}

export async function recalculateUserMemberLevel(userId: string) {
  await userApi.recalculateUserMemberLevel(userId);
}

export async function assignUserMemberLevel(userId: string, memberLevelId: string) {
  await userApi.assignUserMemberLevel(userId, memberLevelId);
}

export async function exportUsersCsv(params?: UserListQuery) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== "") qs.set(k, String(v));
  });
  const q = qs.toString();
  await downloadAdminCsv(`/admin/users/export${q ? `?${q}` : ""}`, "users.csv");
}
