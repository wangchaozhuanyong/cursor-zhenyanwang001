import type { SupportChannelType, SupportDownloadChannel } from "@/types/content";

export function cleanSupportText(value?: string) {
  return String(value || "").trim();
}

export function buildWhatsAppLink(channel: Pick<SupportDownloadChannel, "account" | "linkUrl">): string {
  const link = cleanSupportText(channel.linkUrl);
  if (link) return link;
  const digits = cleanSupportText(channel.account).replace(/\D/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits}`;
}

export function buildWeChatLink(channel: Pick<SupportDownloadChannel, "linkUrl">): string {
  return cleanSupportText(channel.linkUrl);
}

export function buildTelegramLink(channel: Pick<SupportDownloadChannel, "account" | "linkUrl">): string {
  const link = cleanSupportText(channel.linkUrl);
  if (link) return link;
  const username = cleanSupportText(channel.account).replace(/^@+/, "");
  if (!username) return "";
  return `https://t.me/${encodeURIComponent(username)}`;
}

export function getDefaultChannelDescription(type: SupportChannelType): string {
  if (type === "wechat") return "扫码添加官方客服，咨询商品、订单与售后问题。";
  if (type === "whatsapp") return "通过 WhatsApp 联系官方客服。";
  return "通过 Telegram 联系官方客服。";
}

export function getChannelTitle(channel: SupportDownloadChannel): string {
  const name = cleanSupportText(channel.name);
  if (name) return name;
  if (channel.type === "wechat") return "微信客服";
  if (channel.type === "whatsapp") return "WhatsApp 客服";
  return "Telegram 客服";
}
