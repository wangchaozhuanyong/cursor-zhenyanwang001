import { post, get, del } from "@/api/request";
import type {
  LoginParams,
  RegisterParams,
  LoginResult,
  AuthFeatures,
  OtpSendParams,
  OtpLoginParams,
  OAuthExchangeParams,
  WechatBindPhoneParams,
} from "@/types/auth";
import type { UserProfile } from "@/types/user";

export function login(params: LoginParams) {
  return post<LoginResult>("/auth/login", params);
}

export function createLoginChallenge() {
  return post<{ challengeToken: string; expiresInSeconds: number }>("/auth/login-challenge");
}

export function register(params: RegisterParams) {
  return post<LoginResult>("/auth/register", params);
}

export function logout() {
  return post<void>("/auth/logout");
}

export function refreshToken(token: string) {
  return post<{ accessToken: string; refreshToken?: string }>("/auth/refresh", { refreshToken: token });
}

export function logoutAll() {
  return post<void>("/auth/logout-all");
}

export function listSecuritySessions() {
  return get<{ list: Array<{
    id: string;
    deviceId: string;
    deviceName: string;
    ip: string;
    userAgent: string;
    trusted: boolean;
    lastSeenAt: string;
    expiresAt: string;
    revokedAt?: string | null;
  }> }>("/user/security/sessions");
}

export function revokeSecuritySession(id: string) {
  return del<void>(`/user/security/sessions/${id}`);
}

export function requestPasswordReset(params: { phone: string; countryCode?: string }) {
  return post<{ resetToken?: string; expiresInMinutes?: number } | null>("/auth/password-reset/request", params);
}

export function resetPassword(params: { token: string; newPassword: string }) {
  return post<void>("/auth/password-reset/confirm", params);
}

const SESSION_PROBE_REQUEST = {
  skipAuthRetry: true,
  suppressAuthExpired: true,
} as const;

export function getProfile(options?: { sessionProbe?: boolean }) {
  return get<UserProfile>("/user/profile", undefined, options?.sessionProbe ? SESSION_PROBE_REQUEST : undefined);
}

export function sendOtp(params: OtpSendParams) {
  return post<{ devOtp?: string; expiresInSeconds?: number } | null>("/auth/otp/send", params);
}

export function loginWithOtp(params: OtpLoginParams) {
  return post<LoginResult>("/auth/otp/login", params);
}

export function getAuthFeatures() {
  return get<AuthFeatures>("/auth/features");
}

export function exchangeOAuthTicket(params: OAuthExchangeParams) {
  return post<LoginResult>("/auth/oauth/exchange", params);
}

export function sendWechatBindOtp(params: { phone: string; countryCode: string }) {
  return post<{ devOtp?: string; expiresInSeconds?: number } | null>("/auth/wechat/otp/send", params);
}

export function bindWechatPhone(params: WechatBindPhoneParams) {
  return post<LoginResult>("/auth/wechat/bind-phone", params);
}

