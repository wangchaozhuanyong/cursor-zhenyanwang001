import * as rbacApi from "@/api/admin/rbac";
import type { RbacAdminUserRow, RbacRoleRow } from "@/api/admin/rbac";

export type { RbacAdminUserRow, RbacRoleRow };

export async function loadRbacRoles() {
  const res = await rbacApi.fetchRbacRoles();
  return res.data;
}

export async function loadRbacPermissions() {
  const res = await rbacApi.fetchRbacPermissions();
  return res.data;
}

export async function loadRbacAdminUsers() {
  const res = await rbacApi.fetchRbacAdminUsers();
  return res.data;
}

export async function loadUserRoles(userId: string) {
  const res = await rbacApi.fetchRbacUserRoles(userId);
  return res.data;
}

export async function saveUserRoles(userId: string, roleIds: number[]) {
  const res = await rbacApi.updateRbacUserRoles(userId, roleIds);
  return res.data;
}

export async function createRole(body: { code: string; name: string; description?: string; permissionIds?: number[] }) {
  const res = await rbacApi.createRbacRole(body);
  return res.data;
}

export async function updateRole(roleId: number, body: { name?: string; description?: string; permissionIds?: number[] }) {
  const res = await rbacApi.updateRbacRole(roleId, body);
  return res.data;
}

export async function deleteRole(roleId: number) {
  const res = await rbacApi.deleteRbacRole(roleId);
  return res.data;
}

export async function createAdminUser(body: { phone: string; password: string; nickname?: string; roleIds?: number[] }) {
  const res = await rbacApi.createAdminUser(body);
  return res.data;
}

export async function toggleAdminUser(userId: string, enabled: boolean) {
  const res = await rbacApi.toggleAdminUser(userId, enabled);
  return res.data;
}

export async function resetAdminPassword(userId: string, newPassword: string) {
  const res = await rbacApi.resetAdminPassword(userId, newPassword);
  return res.data;
}

export async function deleteAdminUser(userId: string) {
  const res = await rbacApi.deleteAdminUser(userId);
  return res.data;
}
