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

export function buildTelegramLink(channel: Pick<SupportDownloadChannel, "account" | "linkUrl">): string {
  const link = cleanSupportText(channel.linkUrl);
  if (link) return link;
  const username = cleanSupportText(channel.account).replace(/^@+/, "");
  if (!username) return "";
  return `https://t.me/${encodeURIComponent(username)}`;
}

export function getChannelAction(channel: SupportDownloadChannel): {
  primaryLabel: string;
  primaryMode: "copy-wechat" | "copy-account" | "open-link" | "none";
  linkUrl: string;
  copyText: string;
} {
  const account = cleanSupportText(channel.account);
  const type = channel.type as SupportChannelType;

  if (type === "wechat") {
    return {
      primaryLabel: "复制微信号",
      primaryMode: account ? "copy-wechat" : "none",
      linkUrl: "",
      copyText: account,
    };
  }

  if (type === "whatsapp") {
    const linkUrl = buildWhatsAppLink(channel);
    return {
      primaryLabel: "打开 WhatsApp",
      primaryMode: linkUrl ? "open-link" : account ? "copy-account" : "none",
      linkUrl,
      copyText: account,
    };
  }

  if (type === "telegram") {
    const linkUrl = buildTelegramLink(channel);
    return {
      primaryLabel: "打开 Telegram",
      primaryMode: linkUrl ? "open-link" : account ? "copy-account" : "none",
      linkUrl,
      copyText: account,
    };
  }

  return {
    primaryLabel: account ? "复制账号" : "暂无可用操作",
    primaryMode: account ? "copy-account" : "none",
    linkUrl: cleanSupportText(channel.linkUrl),
    copyText: account,
  };
}
