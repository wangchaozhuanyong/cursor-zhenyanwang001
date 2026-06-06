import * as authApi from "@/api/modules/auth";
import { setTokens, setAccessToken, clearTokens, isLoggedIn } from "@/utils/token";
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
import { normalizeBirthdayValue, resolveBirthdayLockedState } from "@/utils/birthday";

const COOKIE_SESSION_ERROR = "登录凭证未生效，请检查 HTTPS、Cookie、域名或 CORS 配置";
const SESSION_RESTORE_TIMEOUT_MS = 12_000;
let restoreSessionInflight: Promise<boolean> | null = null;

/** 登录/注册写入本地标记后，用 Cookie 会话拉取资料，确认浏览器已保存并携带 HttpOnly Cookie */
export async function assertCookieSessionReady(): Promise<void> {
  try {
    await getProfile({ sessionProbe: true });
  } catch {
    clearTokens();
    throw new Error(COOKIE_SESSION_ERROR);
  }
}

async function establishSessionAfterAuth(accessToken: string, refreshToken: string): Promise<void> {
  setTokens(accessToken, refreshToken);
  await assertCookieSessionReady();
}

export async function login(params: LoginParams): Promise<LoginResult> {
  const res = await authApi.login(params);
  const { accessToken, refreshToken } = res.data.token;
  await establishSessionAfterAuth(accessToken, refreshToken);
  return res.data;
}

export async function register(params: RegisterParams): Promise<LoginResult> {
  const res = await authApi.register(params);
  const { accessToken, refreshToken } = res.data.token;
  await establishSessionAfterAuth(accessToken, refreshToken);
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
  await establishSessionAfterAuth(accessToken, refreshToken);
  return res.data;
}

export async function getAuthFeatures() {
  const res = await authApi.getAuthFeatures();
  return res.data;
}

export async function exchangeOAuthTicket(params: OAuthExchangeParams): Promise<LoginResult> {
  const res = await authApi.exchangeOAuthTicket(params);
  const { accessToken, refreshToken } = res.data.token;
  await establishSessionAfterAuth(accessToken, refreshToken);
  return res.data;
}

export async function sendWechatBindOtp(params: { phone: string; countryCode: string }) {
  const res = await authApi.sendWechatBindOtp(params);
  return res.data;
}

export async function bindWechatPhone(params: WechatBindPhoneParams): Promise<LoginResult> {
  const res = await authApi.bindWechatPhone(params);
  const { accessToken, refreshToken } = res.data.token;
  await establishSessionAfterAuth(accessToken, refreshToken);
  return res.data;
}

/** OAuth 重定向已写入 Cookie、仅缺本地登录标记时使用 */
export async function establishSessionFromExistingCookies(): Promise<void> {
  setTokens("", "");
  await assertCookieSessionReady();
}

function mapProfileFromResponse(data: unknown): UserProfile {
  const d = data as Record<string, unknown>;
  const memberLevelId = (d.member_level_id ?? d.memberLevelId ?? "") as string;
  return {
    id: (d.id ?? d.userId ?? "") as string,
    nickname: (d.nickname ?? "") as string,
    avatar: (d.avatar ?? "") as string,
    phone: (d.phone ?? "") as string,
    wechat: (d.wechat ?? "") as string,
    whatsapp: (d.whatsapp ?? "") as string,
    birthday: (() => {
      const normalized = normalizeBirthdayValue(d.birthday as string | null | undefined);
      return normalized || null;
    })(),
    birthdayLocked: resolveBirthdayLockedState({
      birthday: d.birthday as string | null | undefined,
      birthdayLocked: d.birthdayLocked as boolean | number | undefined,
      birthday_locked: d.birthday_locked as boolean | number | undefined,
    }),
    wechatLogin: (() => {
      const raw = (d.wechat_login ?? d.wechatLogin) as unknown as Record<string, unknown> | undefined;
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
        name: (d.member_level_name ?? d.memberLevelName ?? "浼氬憳") as string,
        description: (d.member_level_description ?? d.memberLevelDescription ?? "") as string,
        min_spent: Number(d.member_level_min_spent ?? d.memberLevelMinSpent ?? 0),
        min_orders: Number(d.member_level_min_orders ?? d.memberLevelMinOrders ?? 0),
      }
      : null,
  };
}

/** 后端返回 snake_case，前端统一为 camelCase */
export async function getProfile(options?: { sessionProbe?: boolean }): Promise<UserProfile> {
  const res = await authApi.getProfile(options);
  return mapProfileFromResponse(res.data);
}

async function canUseExistingSession(): Promise<boolean> {
  try {
    await getProfile({ sessionProbe: true });
    return true;
  } catch {
    return false;
  }
}

async function refreshSessionToken(baseUrl: string): Promise<Response> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), SESSION_RESTORE_TIMEOUT_MS);
  try {
    return await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal: controller.signal,
      body: JSON.stringify({}),
    });
  } finally {
    globalThis.clearTimeout(timer);
  }
}

async function hasServerSession(): Promise<boolean> {
  try {
    const res = await authApi.getSessionStatus();
    return Boolean(res.data?.authenticated);
  } catch {
    return true;
  }
}

async function hasRefreshSession(baseUrl: string): Promise<boolean | null> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), SESSION_RESTORE_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/auth/refresh/session`, {
      method: "GET",
      credentials: "include",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { authenticated?: boolean } };
    return Boolean(body?.data?.authenticated);
  } catch {
    return null;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

/**
 * 启动时用 Cookie 刷新会话；无效时清除本地登录标记，且不在无效会话下请求 /user/profile。
 */
async function restoreSessionFromCookieOnce(): Promise<boolean> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";
  try {
    // Refresh cookies are path-scoped to /api/auth/refresh, so /auth/session
    // can be false after the short-lived access cookie expires.
    const serverSessionAvailable = await hasServerSession();
    const refreshSessionAvailable = await hasRefreshSession(baseUrl);

    if (refreshSessionAvailable === false) {
      if (serverSessionAvailable && await canUseExistingSession()) {
        return true;
      }
      clearTokens();
      return false;
    }

    const refreshRes = await refreshSessionToken(baseUrl);
    if (!refreshRes.ok) {
      if (refreshRes.status === 429 || refreshRes.status >= 500) {
        return true;
      }
      if (serverSessionAvailable && await canUseExistingSession()) {
        return true;
      }
      clearTokens();
      return false;
    }

    try {
      const body = (await refreshRes.json()) as { data?: { accessToken?: string } };
      if (body?.data?.accessToken) {
        setAccessToken(body.data.accessToken);
      }
    } catch {
      // refresh 成功但响应体异常时仍尝试拉取资料
    }

    await getProfile({ sessionProbe: true });
    return true;
  } catch {
    return true;
  }
}

export async function restoreSessionFromCookie(): Promise<boolean> {
  if (!isLoggedIn()) return false;
  if (restoreSessionInflight) return restoreSessionInflight;

  restoreSessionInflight = restoreSessionFromCookieOnce().finally(() => {
    restoreSessionInflight = null;
  });
  return restoreSessionInflight;
}

export function isAuthenticated(): boolean {
  return isLoggedIn();
}
