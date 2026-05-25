import { get, put, post } from "@/api/request";
import type { AdminLoginParams, AdminLoginResult, AdminUser } from "@/types/admin";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";

export function adminLogin(params: AdminLoginParams) {
  return post<AdminLoginResult>("/admin/auth/login", params);
}

export function verifyAdminMfa(params: { mfaTicket: string; code: string; trustDevice?: boolean; trustDays?: 7 | 14 | 30 }) {
  return post<AdminLoginResult>("/admin/auth/mfa/verify", params);
}

export function reverifyAdminMfa(params: { code: string; actionClass?: string }, options?: { signal?: AbortSignal }) {
  return post<{ sensitiveActionToken?: string; actionClass?: string; expiresAt?: string; csrfToken?: string }>("/admin/auth/mfa/reverify", params, {
    signal: options?.signal,
  });
}

export function beginAdminPasskeyLogin(params: { mfaTicket: string }) {
  return post<PublicKeyCredentialRequestOptionsJSON>("/admin/auth/passkeys/login/options", params);
}

export function finishAdminPasskeyLogin(params: {
  response: AuthenticationResponseJSON;
  trustDevice?: boolean;
  trustDays?: 7 | 14 | 30;
}) {
  return post<AdminLoginResult>("/admin/auth/passkeys/login/verify", params);
}

export function beginAdminPasskeyStepUp(params: { actionClass?: string }, options?: { signal?: AbortSignal }) {
  return post<PublicKeyCredentialRequestOptionsJSON>("/admin/auth/passkeys/step-up/options", params, {
    signal: options?.signal,
  });
}

export function finishAdminPasskeyStepUp(params: { response: AuthenticationResponseJSON }, options?: { signal?: AbortSignal }) {
  return post<{ sensitiveActionToken?: string; actionClass?: string; expiresAt?: string; csrfToken?: string }>("/admin/auth/passkeys/step-up/verify", params, {
    signal: options?.signal,
  });
}

export function beginAdminPasskeyRegistration() {
  return post<PublicKeyCredentialCreationOptionsJSON>("/admin/auth/passkeys/register/options", {});
}

export function finishAdminPasskeyRegistration(params: { response: RegistrationResponseJSON; label?: string }) {
  return post<void>("/admin/auth/passkeys/register/verify", params);
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
