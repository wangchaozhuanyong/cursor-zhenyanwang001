import { del, get, post, put } from "@/api/request";
import type { MemberLevel, UserProfile, UserTag } from "@/types/user";
import type { PaginatedData, PaginationParams } from "@/types/common";
import type { Product } from "@/types/product";

export interface AdminUserQuery extends PaginationParams {
  keyword?: string;
  tagId?: string;
  wechatBound?: string;
  phoneBound?: string;
  memberLevelId?: string;
  accountStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  totalSpentMin?: string;
  totalSpentMax?: string;
  orderCountMin?: string;
  orderCountMax?: string;
  pointsMin?: string;
  pointsMax?: string;
  refundRateMin?: string;
  refundRateMax?: string;
  orderRestricted?: string;
  couponRestricted?: string;
  commentRestricted?: string;
  sortBy?: string;
  sortDir?: string;
}

export function getUsers(params?: AdminUserQuery) {
  return get<PaginatedData<UserProfile> & { summary?: Record<string, number> }>("/admin/users", params as unknown as Record<string, string>);
}

export interface AdminUserProductActivityQuery extends PaginationParams {
  keyword?: string;
  userId?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AdminUserActivityUser {
  id: string | null;
  nickname: string;
  phone: string;
  avatar?: string;
}

export interface AdminUserFavoriteRow {
  id: string | number;
  favorited_at: string;
  user: AdminUserActivityUser;
  product: Product;
}

export interface AdminUserHistoryRow {
  id: string | number;
  viewed_at: string;
  user: AdminUserActivityUser;
  product: Product;
}

export function getUserFavorites(params?: AdminUserProductActivityQuery) {
  return get<PaginatedData<AdminUserFavoriteRow>>("/admin/user-favorites", params as unknown as Record<string, string>);
}

export function getUserHistory(params?: AdminUserProductActivityQuery) {
  return get<PaginatedData<AdminUserHistoryRow>>("/admin/user-history", params as unknown as Record<string, string>);
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

export function updateUserAccountStatus(id: string, accountStatus: string, reason?: string) {
  return put<void>(`/admin/users/${id}/account-status`, { accountStatus, reason });
}

export function updateUserRestrictions(
  id: string,
  payload: { orderRestricted?: boolean; couponRestricted?: boolean; commentRestricted?: boolean; reason?: string },
) {
  return put<void>(`/admin/users/${id}/restrictions`, payload);
}

export function getUserStatusOverview(id: string) {
  return get<{
    account_status: string;
    restrictions: {
      order_restricted: boolean;
      coupon_restricted: boolean;
      comment_restricted: boolean;
    };
    latest_status_action: {
      operator_id?: string | null;
      operator_name?: string;
      summary?: string;
      created_at?: string | null;
    } | null;
  }>(`/admin/users/${id}/status-overview`);
}

export function resetUserPassword(id: string) {
  return post<{ password: string }>(`/admin/users/${id}/reset-password`);
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
export function getUserTagImpact(id: string) {
  return get<{ affectedUsers: number }>(`/admin/user-tags/${id}/impact`);
}

export function setUserTags(id: string, tagIds: string[]) {
  return put<UserTag[]>(`/admin/users/${id}/tags`, { tagIds });
}

export function batchSetUserTag(tagId: string, userIds: string[]) {
  return put<{ affected: number }>(`/admin/users/tags/batch`, { tagId, userIds });
}

export function toggleSubordinate(id: string, enabled: boolean) {
  return put<void>(`/admin/users/${id}/subordinate`, { enabled });
}

export function adjustUserPoints(userId: string, points: number, reason?: string) {
  return put<void>(`/admin/users/${userId}/points`, { points, reason });
}

export type MemberLevelPayload = Pick<MemberLevel, "name" | "description" | "min_spent" | "min_orders" | "discount_rate" | "points_multiplier" | "free_shipping_enabled" | "sort_order" | "enabled" | "is_default">;

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

export function recalculateAllMemberLevels(options?: { force?: boolean }) {
  return post<{ total: number; changed: number; skippedLocked?: number; force?: boolean }>('/admin/member-levels/recalculate', options || {});
}

export function recalculateUserMemberLevel(userId: string, options?: { force?: boolean }) {
  return post(`/admin/member-levels/recalculate/${userId}`, options || {});
}

export function assignUserMemberLevel(userId: string, memberLevelId: string, reason?: string) {
  return put<void>(`/admin/users/${userId}/member-level`, { memberLevelId, reason });
}

export function unlockUserMemberLevel(userId: string) {
  return del<void>(`/admin/users/${userId}/member-level-lock`);
}
