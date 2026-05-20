import type {
  DownloadPlatform,
  DownloadPlatformType,
  SiteInfo,
  SupportChannelType,
  SupportDownloadChannel,
  SupportDownloadConfig,
  SupportDownloadTab,
} from "@/types/content";

export type LegacySupportDownloadConfig = Partial<SupportDownloadConfig> & {
  workingHours?: string;
  supportDescription?: string;
  showAppInstall?: boolean;
  appInstallTitle?: string;
  appInstallDescription?: string;
  channels?: Array<Partial<SupportDownloadChannel> & { type?: string }>;
};

export const CHANNEL_TYPES: SupportChannelType[] = ["wechat", "whatsapp", "telegram"];
export const PLATFORM_TYPES: DownloadPlatformType[] = ["desktop", "android", "ios"];

export const DEFAULT_PLATFORMS: DownloadPlatform[] = [
  {
    id: "desktop",
    type: "desktop",
    enabled: true,
    title: "电脑端",
    description: "使用 Chrome 或 Edge 打开商城，可把商城安装到电脑桌面。",
    buttonText: "安装到电脑桌面",
    instructions: [
      "使用 Chrome 或 Edge 打开商城。",
      "点击地址栏旁的安装图标，或从浏览器菜单选择「安装应用」。",
      "按系统提示确认即可完成安装。",
    ],
    sortOrder: 1,
  },
  {
    id: "android",
    type: "android",
    enabled: true,
    title: "安卓端",
    description: "在 Android Chrome 中可将商城一键安装到桌面。",
    buttonText: "一键安装到桌面",
    instructions: [
      "请使用 Chrome 打开本网站。",
      "点击「一键安装到桌面」并按提示确认。",
      "也可在浏览器菜单中选择「添加到主屏幕」。",
    ],
    sortOrder: 2,
  },
  {
    id: "ios",
    type: "ios",
    enabled: true,
    title: "苹果端",
    description: "iPhone 需使用 Safari 手动添加到主屏幕。",
    buttonText: "",
    instructions: [
      "点击 Safari 底部分享按钮。",
      "选择「添加到主屏幕」。",
      "点击「添加」完成安装。",
    ],
    sortOrder: 3,
  },
];

export const DEFAULT_SUPPORT_DOWNLOAD_CONFIG: SupportDownloadConfig = {
  enabled: true,
  title: "客服与安装",
  subtitle: "联系客服或将商城添加到桌面，像 App 一样快速打开。",
  defaultTab: "support",
  support: {
    enabled: true,
    title: "客服",
    description: "如需咨询商品、订单、售后或安装问题，请通过下方入口联系官方客服。",
    workingHours: "",
    channels: [],
  },
  download: {
    enabled: true,
    title: "安装",
    description: "选择适合你的设备，把商城添加到桌面使用。",
    platforms: DEFAULT_PLATFORMS,
  },
};

function trim(value?: string) {
  return String(value || "").trim();
}

export function normalizeChannel(
  channel: Partial<SupportDownloadChannel> & { type?: string },
  index: number,
): SupportDownloadChannel | null {
  const type = CHANNEL_TYPES.includes(channel.type as SupportChannelType)
    ? (channel.type as SupportChannelType)
    : null;
  if (!type) return null;
  const typeLabel = type === "wechat" ? "微信" : type === "whatsapp" ? "WhatsApp" : "Telegram";
  return {
    id: trim(channel.id) || `${type}-${index}`,
    type,
    name: trim(channel.name) || `${typeLabel}客服`,
    enabled: channel.enabled !== false,
    account: trim(channel.account),
    linkUrl: trim(channel.linkUrl),
    qrUrl: trim(channel.qrUrl),
    description: trim(channel.description),
    sortOrder: Number(channel.sortOrder) || index + 1,
  };
}

export function normalizePlatform(
  platform: Partial<DownloadPlatform> & { type?: string },
  index: number,
): DownloadPlatform | null {
  const type = PLATFORM_TYPES.includes(platform.type as DownloadPlatformType)
    ? (platform.type as DownloadPlatformType)
    : null;
  if (!type) return null;
  const fallback = DEFAULT_PLATFORMS.find((item) => item.type === type)!;
  return {
    id: trim(platform.id) || type,
    type,
    enabled: platform.enabled !== false,
    title: trim(platform.title) || fallback.title,
    description: trim(platform.description) || fallback.description,
    buttonText: trim(platform.buttonText) || fallback.buttonText,
    instructions: Array.isArray(platform.instructions) && platform.instructions.length > 0
      ? platform.instructions.map(trim).filter(Boolean)
      : fallback.instructions,
    sortOrder: Number(platform.sortOrder) || index + 1,
  };
}

export function normalizeSupportDownloadConfig(config: LegacySupportDownloadConfig): SupportDownloadConfig {
  const legacyChannels = Array.isArray(config.channels) ? config.channels : undefined;
  const rawChannels = Array.isArray(config.support?.channels) ? config.support.channels : legacyChannels;
  const channels = rawChannels
    ?.map(normalizeChannel)
    .filter((item): item is SupportDownloadChannel => Boolean(item))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const rawPlatforms = Array.isArray(config.download?.platforms) ? config.download.platforms : undefined;
  const platforms = rawPlatforms
    ?.map(normalizePlatform)
    .filter((item): item is DownloadPlatform => Boolean(item))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    enabled: config.enabled !== false,
    title: trim(config.title) || DEFAULT_SUPPORT_DOWNLOAD_CONFIG.title,
    subtitle: trim(config.subtitle) || DEFAULT_SUPPORT_DOWNLOAD_CONFIG.subtitle,
    defaultTab: config.defaultTab === "download" ? "download" : "support",
    support: {
      enabled: config.support?.enabled !== false,
      title: trim(config.support?.title) || DEFAULT_SUPPORT_DOWNLOAD_CONFIG.support.title,
      description: trim(config.support?.description ?? config.supportDescription)
        || DEFAULT_SUPPORT_DOWNLOAD_CONFIG.support.description,
      workingHours: trim(config.support?.workingHours ?? config.workingHours),
      channels: channels ?? [],
    },
    download: {
      enabled: config.download?.enabled !== false && config.showAppInstall !== false,
      title: trim(config.download?.title ?? config.appInstallTitle) || DEFAULT_SUPPORT_DOWNLOAD_CONFIG.download.title,
      description: trim(config.download?.description ?? config.appInstallDescription)
        || DEFAULT_SUPPORT_DOWNLOAD_CONFIG.download.description,
      platforms: platforms?.length ? platforms : DEFAULT_PLATFORMS,
    },
  };
}

export function parseSupportDownloadConfig(
  raw: string | undefined,
  siteInfo?: SiteInfo,
): SupportDownloadConfig {
  if (!raw?.trim()) {
    const base = normalizeSupportDownloadConfig(DEFAULT_SUPPORT_DOWNLOAD_CONFIG);
    if (siteInfo?.businessHours) {
      return { ...base, support: { ...base.support, workingHours: trim(siteInfo.businessHours) } };
    }
    return base;
  }
  try {
    const parsed = JSON.parse(raw) as LegacySupportDownloadConfig;
    return normalizeSupportDownloadConfig(parsed);
  } catch {
    return normalizeSupportDownloadConfig(DEFAULT_SUPPORT_DOWNLOAD_CONFIG);
  }
}

export function getEnabledSupportChannels(config: SupportDownloadConfig): SupportDownloadChannel[] {
  return (config.support.channels || [])
    .filter((c) => c.enabled !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function getEnabledDownloadPlatforms(config: SupportDownloadConfig): DownloadPlatform[] {
  return (config.download.platforms || DEFAULT_PLATFORMS)
    .filter((p) => p.enabled !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function normalizeSupportDownloadTab(
  value: string | null,
  fallback: SupportDownloadTab = "support",
): SupportDownloadTab {
  return value === "download" || value === "support" ? value : fallback;
}
