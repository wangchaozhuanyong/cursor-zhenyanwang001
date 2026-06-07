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

export function getDefaultChannelDescription(_type: SupportChannelType): string {
  return "";
}

export function getChannelTitle(channel: SupportDownloadChannel): string {
  return cleanSupportText(channel.name);
}
