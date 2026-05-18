import * as meApi from "@/api/modules/me";

export type MeSummary = meApi.MeSummaryResponse;
export type WechatLoginBinding = meApi.WechatLoginBinding;

export async function fetchMeSummary(): Promise<MeSummary> {
  const res = await meApi.getMeSummary();
  return res.data;
}

export async function fetchWechatBinding(): Promise<WechatLoginBinding> {
  const res = await meApi.getWechatBinding();
  return res.data;
}

export async function startBindWechat(redirect?: string): Promise<string> {
  const res = await meApi.bindWechat(redirect);
  return String(res.data?.authorizeUrl || "");
}

export async function unbindWechat(): Promise<void> {
  await meApi.unbindWechat();
}
