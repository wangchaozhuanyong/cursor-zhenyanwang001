import type {
  DownloadPlatform,
  DownloadPlatformType,
  SupportChannelType,
  SupportDownloadChannel,
  SupportDownloadConfig,
  SupportDownloadTab,
} from "@/types/content";
import { STORE_COPY } from "@/constants/storeCopy";

export type LegacySupportDownloadConfig = Partial<SupportDownloadConfig> & {
  workingHours?: string;
  supportDescription?: string;
  showAppInstall?: boolean;
  appInstallTitle?: string;
  appInstallDescription?: string;
  channels?: Array<Partial<SupportDownloadChannel> & { type?: string }>;
};

export const CHANNEL_TYPES: SupportChannelType[] = ["wechat", "whatsapp", "telegram"];
export const PLATFORM_TYPES: DownloadPlatformType[] = ["android", "ios"];

export const DEFAULT_PLATFORMS: DownloadPlatform[] = [
  {
    id: "android",
    type: "android",
    enabled: true,
    title: "安卓手机",
    description: `可将${STORE_COPY.brandName}添加到安卓手机桌面，像 App 一样快速打开。`,
    buttonText: "一键添加到桌面",
    instructions: [
      "点击浏览器右上角“菜单”或“...”",
      "选择“添加到桌面 / 添加到主屏幕 / 发送到桌面”",
      "点击确认后，回到手机桌面打开",
    ],
    sortOrder: 1,
  },
  {
    id: "ios",
    type: "ios",
    enabled: true,
    title: "苹果手机",
    description: `请使用 Safari 浏览器将${STORE_COPY.brandName}添加到主屏幕。`,
    buttonText: "复制链接，用 Safari 打开",
    instructions: [
      "点击 Safari 底部工具栏的“分享”按钮",
      "向下滑动，选择“添加到主屏幕”",
      "点击右上角“添加”，之后从桌面图标进入",
    ],
    sortOrder: 2,
  },
];

export const DEFAULT_SUPPORT_DOWNLOAD_CONFIG: SupportDownloadConfig = {
  enabled: true,
  title: STORE_COPY.supportCenterTitle,
  subtitle: STORE_COPY.supportSubtitle,
  defaultTab: "support",
  support: {
    enabled: true,
    description: STORE_COPY.supportDescription,
    workingHours: "",
    channels: [],
  },
  download: {
    enabled: false,
    title: "添加到桌面",
    description: `可将${STORE_COPY.brandName}添加到手机桌面，像 App 一样快速打开。`,
    platforms: DEFAULT_PLATFORMS,
  },
};

function trim(value?: string) {
  return String(value || "").trim();
}

/** 字段未配置时用默认值；显式空字符串保留为空（与后台清空说明一致） */
export function resolveOptionalConfigText(
  value: string | undefined | null,
  fallback: string,
): string {
  if (value === undefined || value === null) return fallback;
  return trim(value);
}

function resolveFromSources(
  sources: Array<string | undefined | null>,
  fallback: string,
): string {
  for (const source of sources) {
    if (source !== undefined && source !== null) return trim(source);
  }
  return fallback;
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
  const fallback = DEFAULT_PLATFORMS.find((item) => item.type === type) || DEFAULT_PLATFORMS[0];
  return {
    id: trim(platform.id) || type,
    type,
    enabled: platform.enabled !== false,
    title: trim(platform.title) || fallback.title,
    description: resolveOptionalConfigText(platform.description, fallback.description),
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
    title: resolveOptionalConfigText(config.title, DEFAULT_SUPPORT_DOWNLOAD_CONFIG.title),
    subtitle: resolveOptionalConfigText(config.subtitle, DEFAULT_SUPPORT_DOWNLOAD_CONFIG.subtitle),
    defaultTab: "support",
    support: {
      enabled: config.support?.enabled !== false,
      description: resolveFromSources(
        [config.support?.description, config.supportDescription],
        DEFAULT_SUPPORT_DOWNLOAD_CONFIG.support.description,
      ),
      workingHours: trim(config.support?.workingHours ?? config.workingHours),
      channels: channels ?? [],
    },
    download: {
      enabled: false,
      title: resolveFromSources(
        [config.download?.title, config.appInstallTitle],
        DEFAULT_SUPPORT_DOWNLOAD_CONFIG.download.title,
      ),
      description: resolveFromSources(
        [config.download?.description, config.appInstallDescription],
        DEFAULT_SUPPORT_DOWNLOAD_CONFIG.download.description,
      ),
      platforms: platforms?.length ? platforms : DEFAULT_PLATFORMS,
    },
  };
}

/** 前台客服中心页默认入口（与底部导航、订单「联系客服」一致） */
export const SUPPORT_PAGE_PATH = "/support-download?tab=support";

export function buildSupportPageUrl(channelId?: string): string {
  const id = trim(channelId);
  if (!id) return SUPPORT_PAGE_PATH;
  return `/support-download?channelId=${encodeURIComponent(id)}&tab=support`;
}

export function parseSupportDownloadConfig(raw: string | undefined): SupportDownloadConfig {
  if (!raw?.trim()) {
    return normalizeSupportDownloadConfig(DEFAULT_SUPPORT_DOWNLOAD_CONFIG);
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
  if (config.download.enabled === false) return [];
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
