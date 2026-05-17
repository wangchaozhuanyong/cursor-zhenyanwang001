import { del, get, post, put } from "@/api/request";
import type { MemberLevel, UserProfile, UserTag } from "@/types/user";
import type { PaginatedData, PaginationParams } from "@/types/common";

export function getUsers(params?: PaginationParams & {
  keyword?: string;
  tagId?: string;
  wechatBound?: string;
  phoneBound?: string;
}) {
  return get<PaginatedData<UserProfile>>("/admin/users", params as Record<string, string>);
}

export function unbindUserWechat(id: string) {
  return post<void>(`/admin/users/${id}/unbind-wechat`);
}

export function getUserById(id: string) {
  return get<UserProfile>(`/admin/users/${id}`);
}

export function updateUser(id: string, data: Partial<UserProfile>) {
  return put<UserProfile>(`/admin/users/${id}`, data);
}

export function getUserTags() {
  return get<UserTag[]>("/admin/user-tags");
}

export function createUserTag(data: Pick<UserTag, "name"> & Partial<Pick<UserTag, "color" | "description" | "sort_order">>) {
  return post<UserTag>("/admin/user-tags", data);
}

export function updateUserTag(id: string, data: Partial<UserTag>) {
  return put<void>(`/admin/user-tags/${id}`, data);
}

export function deleteUserTag(id: string) {
  return del<void>(`/admin/user-tags/${id}`);
}

export function setUserTags(id: string, tagIds: string[]) {
  return put<UserTag[]>(`/admin/users/${id}/tags`, { tagIds });
}

export function toggleSubordinate(id: string, enabled: boolean) {
  return put<void>(`/admin/users/${id}/subordinate`, { enabled });
}

export function adjustUserPoints(userId: string, points: number, reason?: string) {
  return put<void>(`/admin/users/${userId}/points`, { points, reason });
}

export type MemberLevelPayload = Pick<MemberLevel, "name" | "description" | "min_spent" | "min_orders" | "sort_order" | "enabled" | "is_default">;

export function getMemberLevels() {
  return get<MemberLevel[]>("/admin/member-levels");
}

export function createMemberLevel(data: MemberLevelPayload) {
  return post<{ id: string }>("/admin/member-levels", data);
}

export function updateMemberLevel(id: string, data: MemberLevelPayload) {
  return put<void>(`/admin/member-levels/${id}`, data);
}

export function deleteMemberLevel(id: string) {
  return del<void>(`/admin/member-levels/${id}`);
}

