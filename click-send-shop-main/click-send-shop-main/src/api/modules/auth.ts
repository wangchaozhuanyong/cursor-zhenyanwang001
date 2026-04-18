import { post, get } from "../request";
import type { LoginParams, RegisterParams, LoginResult } from "@/types/auth";
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

export function getProfile() {
  return get<UserProfile>("/auth/profile");
}
