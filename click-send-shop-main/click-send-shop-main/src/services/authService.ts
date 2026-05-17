import * as authApi from "@/api/modules/auth";
import { setTokens, clearTokens, isLoggedIn } from "@/utils/token";
import type {
  LoginParams,
  RegisterParams,
  LoginResult,
  OtpSendParams,
  OtpLoginParams,
  OAuthExchangeParams,
  WechatBindPhoneParams,
} from "@/types/auth";
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

export async function requestPasswordReset(params: { phone: string; countryCode?: string }) {
  const res = await authApi.requestPasswordReset(params);
  return res.data;
}

export async function resetPassword(params: { token: string; newPassword: string }) {
  await authApi.resetPassword(params);
}

export async function sendOtp(params: OtpSendParams) {
  const res = await authApi.sendOtp(params);
  return res.data;
}

export async function loginWithOtp(params: OtpLoginParams): Promise<LoginResult> {
  const res = await authApi.loginWithOtp(params);
  const { accessToken, refreshToken } = res.data.token;
  setTokens(accessToken, refreshToken);
  return res.data;
}

export async function getAuthFeatures() {
  const res = await authApi.getAuthFeatures();
  return res.data;
}

export async function exchangeOAuthTicket(params: OAuthExchangeParams): Promise<LoginResult> {
  const res = await authApi.exchangeOAuthTicket(params);
  const { accessToken, refreshToken } = res.data.token;
  setTokens(accessToken, refreshToken);
  return res.data;
}

export async function sendWechatBindOtp(params: { phone: string; countryCode: string }) {
  const res = await authApi.sendWechatBindOtp(params);
  return res.data;
}

export async function bindWechatPhone(params: WechatBindPhoneParams): Promise<LoginResult> {
  const res = await authApi.bindWechatPhone(params);
  const { accessToken, refreshToken } = res.data.token;
  setTokens(accessToken, refreshToken);
  return res.data;
}

/** 后端返回 snake_case，前端统一用 camelCase */
export async function getProfile(): Promise<UserProfile> {
  const res = await authApi.getProfile();
  const d = res.data as Record<string, unknown>;
  const memberLevelId = (d.member_level_id ?? d.memberLevelId ?? "") as string;
  return {
    id: (d.id ?? d.userId ?? "") as string,
    nickname: (d.nickname ?? "") as string,
    avatar: (d.avatar ?? "") as string,
    phone: (d.phone ?? "") as string,
    wechat: (d.wechat ?? "") as string,
    whatsapp: (d.whatsapp ?? "") as string,
    wechatLogin: (() => {
      const raw = (d.wechat_login ?? d.wechatLogin) as Record<string, unknown> | undefined;
      if (!raw || typeof raw !== "object") return { bound: false };
      return {
        bound: Boolean(raw.bound),
        nickname: (raw.nickname as string | null | undefined) ?? null,
        avatarUrl: (raw.avatarUrl ?? raw.avatar_url ?? null) as string | null,
        boundAt: (raw.boundAt ?? raw.bound_at ?? undefined) as string | undefined,
      };
    })(),
    inviteCode: (d.inviteCode ?? d.invite_code ?? "") as string,
    parentInviteCode: (d.parentInviteCode ?? d.parent_invite_code ?? "") as string,
    pointsBalance: Number(d.pointsBalance ?? d.points_balance ?? 0),
    subordinateEnabled: Boolean(d.subordinateEnabled ?? d.subordinate_enabled ?? false),
    memberLevel: memberLevelId
      ? {
        id: memberLevelId,
        name: (d.member_level_name ?? d.memberLevelName ?? "会员") as string,
        description: (d.member_level_description ?? d.memberLevelDescription ?? "") as string,
        min_spent: Number(d.member_level_min_spent ?? d.memberLevelMinSpent ?? 0),
        min_orders: Number(d.member_level_min_orders ?? d.memberLevelMinOrders ?? 0),
      }
      : null,
  };
}

export function isAuthenticated(): boolean {
  return isLoggedIn();
}
