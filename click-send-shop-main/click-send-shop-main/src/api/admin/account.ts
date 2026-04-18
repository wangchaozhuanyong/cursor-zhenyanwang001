import { get, put, post } from "../request";
import type { AdminUser, AdminLoginParams } from "@/types/admin";

export function adminLogin(params: AdminLoginParams) {
  return post<{ token: string; user: AdminUser }>("/admin/auth/login", params);
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
