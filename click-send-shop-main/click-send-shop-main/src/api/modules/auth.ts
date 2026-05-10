import { post, get } from "../request";
import type {
  LoginParams,
  RegisterParams,
  LoginResult,
  OtpSendParams,
  OtpLoginParams,
  OAuthExchangeParams,
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

export function getProfile() {
  return get<UserProfile>("/user/profile");
}

export function sendOtp(params: OtpSendParams) {
  return post<{ devOtp?: string; expiresInSeconds?: number } | null>("/auth/otp/send", params);
}

export function loginWithOtp(params: OtpLoginParams) {
  return post<LoginResult>("/auth/otp/login", params);
}

export function exchangeOAuthTicket(params: OAuthExchangeParams) {
  return post<LoginResult>("/auth/oauth/exchange", params);
}
