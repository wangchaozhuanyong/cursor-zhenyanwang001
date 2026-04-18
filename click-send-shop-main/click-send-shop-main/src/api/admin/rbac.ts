import { get, put, post, del } from "../request";

export interface RbacRoleRow {
  id: number;
  code: string;
  name: string;
  description?: string;
  is_system: number;
  permissionIds: number[];
}

export interface RbacAdminUserRow {
  id: string;
  phone: string;
  nickname: string;
  email: string;
  role: string;
  created_at: string;
  last_login_at: string | null;
}

export interface RbacUserRolesPayload {
  userId: string;
  legacyRole: string;
  roles: { id: number; code: string; name: string }[];
  roleIds: number[];
}

export function fetchRbacRoles() {
  return get<RbacRoleRow[]>("/admin/rbac/roles");
}

export function fetchRbacAdminUsers() {
  return get<RbacAdminUserRow[]>("/admin/rbac/admin-users");
}

export function fetchRbacUserRoles(userId: string) {
  return get<RbacUserRolesPayload>(`/admin/rbac/users/${userId}/roles`);
}

export function updateRbacUserRoles(userId: string, roleIds: number[]) {
  return put<{ userId: string; roleIds: number[] }>(`/admin/rbac/users/${userId}/roles`, { roleIds });
}

export function createRbacRole(body: { code: string; name: string; description?: string; permissionIds?: number[] }) {
  return post<{ id: number; code: string; name: string }>("/admin/rbac/roles", body);
}

export function updateRbacRole(roleId: number, body: { name?: string; description?: string; permissionIds?: number[] }) {
  return put<null>(`/admin/rbac/roles/${roleId}`, body);
}

export function deleteRbacRole(roleId: number) {
  return del<null>(`/admin/rbac/roles/${roleId}`);
}

export function fetchRbacPermissions() {
  return get<{ id: number; code: string; name: string; sort_order: number }[]>("/admin/rbac/permissions");
}

export function createAdminUser(body: { phone: string; password: string; nickname?: string; roleIds?: number[] }) {
  return post<{ id: string; phone: string; nickname: string }>("/admin/rbac/admin-users", body);
}

export function toggleAdminUser(userId: string, enabled: boolean) {
  return put<null>(`/admin/rbac/admin-users/${userId}/toggle`, { enabled });
}

export function resetAdminPassword(userId: string, newPassword: string) {
  return put<null>(`/admin/rbac/admin-users/${userId}/reset-password`, { newPassword });
}

export function deleteAdminUser(userId: string) {
  return del<null>(`/admin/rbac/admin-users/${userId}`);
}
