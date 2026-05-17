import * as meApi from "@/api/modules/me";
import type { WechatLoginBinding } from "@/types/user";

export async function fetchWechatBinding(): Promise<WechatLoginBinding & { wechatLoginEnabled?: boolean }> {
  const res = await meApi.getWechatBinding();
  const d = res.data as Record<string, unknown>;
  return {
    bound: Boolean(d.bound),
    nickname: (d.nickname as string | null | undefined) ?? null,
    avatarUrl: (d.avatarUrl ?? d.avatar_url ?? null) as string | null,
    boundAt: (d.boundAt ?? d.bound_at ?? undefined) as string | undefined,
    wechatLoginEnabled: Boolean(d.wechatLoginEnabled ?? d.wechat_login_enabled),
  };
}

export async function startBindWechat(redirect = "/settings") {
  const res = await meApi.bindWechat(redirect);
  const url = res.data?.authorizeUrl;
  if (!url) throw new Error("无法获取微信授权地址");
  window.location.href = url;
}

export async function unbindWechat() {
  await meApi.unbindWechat();
}
