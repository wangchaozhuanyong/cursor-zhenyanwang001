import * as accountApi from "@/api/admin/account";
import { setAdminTokens, clearAdminTokens, isAdminLoggedIn } from "@/utils/token";
import type { AdminLoginParams, AdminUser } from "@/types/admin";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";

const ADMIN_FLAG_KEY = "admin_authenticated";

export async function adminLogin(
  params: AdminLoginParams,
): Promise<{ token: string; user: AdminUser }> {
  const res = await accountApi.adminLogin(params);
  const d = res.data as Record<string, unknown>;

  // Backend returns { token: { accessToken, refreshToken }, userId }
  const tokenObj = d.token as { accessToken?: string; refreshToken?: string } | undefined;
  const accessToken = tokenObj?.accessToken || (d.accessToken as string) || "";
  const refreshToken = tokenObj?.refreshToken || (d.refreshToken as string) || "";

  setAdminTokens(accessToken, refreshToken);
  localStorage.setItem(ADMIN_FLAG_KEY, "1");

  const permissions = (d.permissions as string[]) || [];
  const isSuperAdmin = !!d.isSuperAdmin;
  useAdminPermissionStore.getState().setAccess({ permissions, isSuperAdmin });

  const user: AdminUser = {
    id: String(d.userId || ""),
    username: params.username,
    role: (d.role as AdminUser["role"]) || "admin",
    permissions,
    isSuperAdmin,
    roleCodes: (d.roleCodes as string[]) || [],
  };

  return {
    token: accessToken,
    user,
  };
}

export async function fetchAdminProfile(): Promise<AdminUser> {
  const res = await accountApi.getAdminProfile();
  const user = res.data as AdminUser;
  useAdminPermissionStore.getState().setAccess({
    permissions: user.permissions ?? [],
    isSuperAdmin: !!user.isSuperAdmin,
  });
  return user;
}

export async function updateAdminProfile(data: Partial<AdminUser>) {
  const res = await accountApi.updateAdminProfile(data);
  return res.data;
}

export async function changeAdminPassword(oldPassword: string, newPassword: string) {
  await accountApi.changeAdminPassword(oldPassword, newPassword);
}

export function isAdminAuthenticated(): boolean {
  return isAdminLoggedIn() && localStorage.getItem(ADMIN_FLAG_KEY) === "1";
}

export async function adminLogout(): Promise<void> {
  try {
    await accountApi.adminLogoutApi();
  } catch { /* best-effort */ }
  clearAdminTokens();
  localStorage.removeItem(ADMIN_FLAG_KEY);
  useAdminPermissionStore.getState().clear();
}
