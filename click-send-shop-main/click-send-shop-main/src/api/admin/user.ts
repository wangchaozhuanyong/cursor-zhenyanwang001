import { get, put } from "../request";
import type { UserProfile } from "@/types/user";
import type { PaginatedData, PaginationParams } from "@/types/common";

export function getUsers(params?: PaginationParams & { keyword?: string }) {
  return get<PaginatedData<UserProfile>>("/admin/users", params as Record<string, string>);
}

export function getUserById(id: string) {
  return get<UserProfile>(`/admin/users/${id}`);
}

export function updateUser(id: string, data: Partial<UserProfile>) {
  return put<UserProfile>(`/admin/users/${id}`, data);
}

export function toggleSubordinate(id: string, enabled: boolean) {
  return put<void>(`/admin/users/${id}/subordinate`, { enabled });
}

export function adjustUserPoints(userId: string, points: number, reason?: string) {
  return put<void>(`/admin/users/${userId}/points`, { points, reason });
}
