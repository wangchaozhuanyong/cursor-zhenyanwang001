import * as userApi from "@/api/admin/user";
import type { MemberLevelPayload } from "@/api/admin/user";
import type { PaginatedData, PaginationParams } from "@/types/common";
import type { MemberLevel, UserProfile, UserTag } from "@/types/user";
import { downloadAdminCsv } from "@/utils/adminCsvDownload";
import { unwrapList, unwrapPaginated } from "@/services/responseNormalize";

export async function fetchUsers(params?: PaginationParams & {
  keyword?: string;
  tagId?: string;
  wechatBound?: string;
  phoneBound?: string;
}): Promise<PaginatedData<UserProfile>> {
  const res = await userApi.getUsers(params);
  return unwrapPaginated<UserProfile>(res.data);
}

export async function fetchUserById(id: string) {
  const res = await userApi.getUserById(id);
  return res.data;
}

export async function unbindUserWechat(id: string) {
  await userApi.unbindUserWechat(id);
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

export async function setUserTags(id: string, tagIds: string[]) {
  const res = await userApi.setUserTags(id, tagIds);
  return unwrapList<UserTag>(res.data);
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

export async function exportUsersCsv(params?: { keyword?: string; tagId?: string }) {
  const qs = new URLSearchParams();
  if (params?.keyword) qs.set("keyword", params.keyword);
  if (params?.tagId) qs.set("tagId", params.tagId);
  const q = qs.toString();
  await downloadAdminCsv(`/admin/users/export${q ? `?${q}` : ""}`, "users.csv");
}
