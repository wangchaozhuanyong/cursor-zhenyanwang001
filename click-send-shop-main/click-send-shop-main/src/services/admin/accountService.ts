import * as accountApi from "@/api/admin/account";
import { setAdminTokens, clearAdminTokens, isAdminLoggedIn } from "@/utils/token";
import type { AdminLoginParams, AdminLoginResult, AdminUser } from "@/types/admin";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { clearAdminQueryCache } from "@/lib/queryClient";
import { clearAdminCsrfToken, setAdminCsrfToken } from "@/lib/adminCsrf";

const ADMIN_FLAG_KEY = "admin_authenticated";

export async function adminLogin(
  params: AdminLoginParams,
): Promise<AdminLoginResult> {
  const username = String(params.username || "").trim();
  const payload: AdminLoginParams = {
    username,
    phone: username,
    password: params.password,
  };
  if (params.countryCode) payload.countryCode = params.countryCode;

  const res = await accountApi.adminLogin(payload);
  return applyAdminLoginPayload(res.data as unknown as Record<string, unknown>, username);
}

function applyAdminLoginPayload(d: Record<string, unknown>, username: string): AdminLoginResult {
  if (d.mfaRequired || d.mfaSetupRequired) {
    return {
      mfaRequired: Boolean(d.mfaRequired),
      mfaSetupRequired: Boolean(d.mfaSetupRequired),
      mfaTicket: String(d.mfaTicket || ""),
      secret: d.secret ? String(d.secret) : undefined,
      otpAuthUrl: d.otpAuthUrl ? String(d.otpAuthUrl) : undefined,
    };
  }
  // Backend returns { token: { accessToken, refreshToken }, userId }
  const tokenObj = d.token as { accessToken?: string; refreshToken?: string } | undefined;
  const accessToken = tokenObj?.accessToken || (d.accessToken as string) || "";
  const refreshToken = tokenObj?.refreshToken || (d.refreshToken as string) || "";

  setAdminTokens(accessToken, refreshToken);
  setAdminCsrfToken(d.csrfToken as string | undefined);
  localStorage.setItem(ADMIN_FLAG_KEY, "1");

  const permissions = (d.permissions as string[]) || [];
  const isSuperAdmin = !!d.isSuperAdmin;
  useAdminPermissionStore.getState().setAccess({ permissions, isSuperAdmin });

  const user: AdminUser = {
    id: String(d.userId || ""),
    username,
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

export async function verifyAdminMfa(
  params: { mfaTicket: string; code: string; username?: string },
): Promise<AdminLoginResult> {
  const res = await accountApi.verifyAdminMfa({ mfaTicket: params.mfaTicket, code: params.code });
  return applyAdminLoginPayload(res.data as unknown as Record<string, unknown>, params.username || "");
}

export async function reverifyAdminMfa(code: string, options?: { signal?: AbortSignal }): Promise<void> {
  const res = await accountApi.reverifyAdminMfa({ code }, options);
  setAdminCsrfToken(res.data?.csrfToken);
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
  clearAdminCsrfToken();
  localStorage.removeItem(ADMIN_FLAG_KEY);
  useAdminPermissionStore.getState().clear();
  clearAdminQueryCache();
}
