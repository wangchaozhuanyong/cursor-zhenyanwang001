import type { SiteInfo, SupportDownloadChannel } from "@/types/content";
import {
  buildSupportPageUrl,
  getEnabledSupportChannels,
  parseSupportDownloadConfig,
} from "@/utils/supportDownloadConfig";
import {
  buildTelegramLink,
  buildWhatsAppLink,
  buildWeChatLink,
  cleanSupportText,
} from "@/utils/supportChannels";

export type CustomerServiceAction = "whatsapp" | "wechat" | "wechat_copy" | "telegram" | "support_page";

export type CustomerServiceResult = {
  action: CustomerServiceAction;
  wechatId?: string;
  channelId?: string;
};

export type CustomerServiceSiteInfo = Pick<SiteInfo, "supportDownloadConfig">;

const DEFAULT_WHATSAPP_TEXT = "你好，我想咨询商品";

function appendWhatsAppText(url: string, text = DEFAULT_WHATSAPP_TEXT): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}text=${encodeURIComponent(text)}`;
}

/** 打开指定客服渠道；无法直接打开时返回 none */
export function openSupportChannel(channel: SupportDownloadChannel): CustomerServiceAction | "none" {
  if (channel.type === "whatsapp") {
    const url = buildWhatsAppLink(channel);
    if (url) {
      window.open(appendWhatsAppText(url), "_blank", "noopener,noreferrer");
      return "whatsapp";
    }
    return "none";
  }
  if (channel.type === "wechat") {
    const account = cleanSupportText(channel.account);
    const link = buildWeChatLink(channel);
    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
      return "wechat";
    }
    if (account) return "wechat_copy";
    return "none";
  }
  const telegramUrl = buildTelegramLink(channel);
  if (telegramUrl) {
    window.open(telegramUrl, "_blank", "noopener,noreferrer");
    return "telegram";
  }
  return "none";
}

/**
 * 打开客服：按后台「客服中心配置」渠道顺序尝试 WhatsApp → 微信 → Telegram，
 * 均不可用时跳转客服中心页。
 */
export function openCustomerService(siteInfo: CustomerServiceSiteInfo): CustomerServiceResult {
  const config = parseSupportDownloadConfig(siteInfo.supportDownloadConfig);
  const channels = getEnabledSupportChannels(config);

  for (const channel of channels) {
    if (channel.type !== "whatsapp") continue;
    const opened = openSupportChannel(channel);
    if (opened === "whatsapp") {
      return { action: "whatsapp", channelId: channel.id };
    }
  }

  for (const channel of channels) {
    if (channel.type !== "wechat") continue;
    const account = cleanSupportText(channel.account);
    const opened = openSupportChannel(channel);
    if (opened === "wechat") {
      return { action: "wechat", channelId: channel.id };
    }
    if (account) {
      return { action: "wechat_copy", wechatId: account, channelId: channel.id };
    }
  }

  for (const channel of channels) {
    if (channel.type !== "telegram") continue;
    const opened = openSupportChannel(channel);
    if (opened === "telegram") {
      return { action: "telegram", channelId: channel.id };
    }
  }

  return { action: "support_page" };
}

export { buildSupportPageUrl };
