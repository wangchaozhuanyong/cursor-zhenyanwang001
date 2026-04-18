import * as authApi from "@/api/modules/auth";
import { setTokens, clearTokens, isLoggedIn } from "@/utils/token";
import type { LoginParams, RegisterParams, LoginResult } from "@/types/auth";
import type { UserProfile } from "@/types/user";

export async function login(params: LoginParams): Promise<LoginResult> {
  const res = await authApi.login(params);
  const { accessToken, refreshToken } = res.data.token;
  setTokens(accessToken, refreshToken);
  return res.data;
}

export async function register(params: RegisterParams): Promise<LoginResult> {
  const res = await authApi.register(params);
  const { accessToken, refreshToken } = res.data.token;
  setTokens(accessToken, refreshToken);
  return res.data;
}

export async function logout(): Promise<void> {
  try {
    await authApi.logout();
  } finally {
    clearTokens();
  }
}

/** 后端返回 snake_case，前端统一用 camelCase */
export async function getProfile(): Promise<UserProfile> {
  const res = await authApi.getProfile();
  const d = res.data as Record<string, unknown>;
  return {
    id: (d.id ?? d.userId ?? "") as string,
    nickname: (d.nickname ?? "") as string,
    avatar: (d.avatar ?? "") as string,
    phone: (d.phone ?? "") as string,
    wechat: (d.wechat ?? "") as string,
    whatsapp: (d.whatsapp ?? "") as string,
    inviteCode: (d.inviteCode ?? d.invite_code ?? "") as string,
    parentInviteCode: (d.parentInviteCode ?? d.parent_invite_code ?? "") as string,
    pointsBalance: Number(d.pointsBalance ?? d.points_balance ?? 0),
    subordinateEnabled: Boolean(d.subordinateEnabled ?? d.subordinate_enabled ?? false),
  };
}

export function isAuthenticated(): boolean {
  return isLoggedIn();
}
