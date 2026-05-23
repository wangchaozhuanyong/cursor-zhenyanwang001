import { get, put, post } from "@/api/request";
import type { AdminLoginParams, AdminLoginResult, AdminUser } from "@/types/admin";

export function adminLogin(params: AdminLoginParams) {
  return post<AdminLoginResult>("/admin/auth/login", params);
}

export function verifyAdminMfa(params: { mfaTicket: string; code: string }) {
  return post<AdminLoginResult>("/admin/auth/mfa/verify", params);
}

export function reverifyAdminMfa(params: { code: string }, options?: { signal?: AbortSignal }) {
  return post<{ mfaVerifiedAt?: number; csrfToken?: string }>("/admin/auth/mfa/reverify", params, {
    signal: options?.signal,
  });
}

export function adminLogoutApi() {
  return post<void>("/admin/auth/logout");
}

export function getAdminProfile() {
  return get<AdminUser>("/admin/account/profile");
}

export function updateAdminProfile(data: Partial<AdminUser>) {
  return put<AdminUser>("/admin/account/profile", data);
}

export function changeAdminPassword(oldPassword: string, newPassword: string) {
  return put<void>("/admin/account/password", { oldPassword, newPassword });
}

