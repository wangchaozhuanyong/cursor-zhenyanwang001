import { post, get } from "@/api/request";
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

export function register(params: RegisterParams) {
  return post<LoginResult>("/auth/register", params);
}

export function logout() {
  return post<void>("/auth/logout");
}

export function refreshToken(token: string) {
  return post<{ accessToken: string }>("/auth/refresh", { refreshToken: token });
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

export function getSessionStatus() {
  return get<{ authenticated: boolean }>("/auth/session", undefined, {
    skipAuthRetry: true,
    suppressAuthExpired: true,
  });
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
