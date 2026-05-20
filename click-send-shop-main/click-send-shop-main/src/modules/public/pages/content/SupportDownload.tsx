import { useEffect, useMemo, useState } from "react";
import { Apple, Clock, Copy, Download, ExternalLink, Headphones, MessageCircle, Monitor, QrCode, Send, Share2, Smartphone, type LucideIcon } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import SeoHead from "@/components/SeoHead";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { buildCanonical } from "@/utils/seo";
import { trackEvent } from "@/services/analyticsService";
import type { DownloadPlatform, DownloadPlatformType, SiteInfo, SupportChannelType, SupportDownloadChannel, SupportDownloadConfig, SupportDownloadTab } from "@/types/content";

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type LegacySupportDownloadConfig = Partial<SupportDownloadConfig> & {
  workingHours?: string;
  supportDescription?: string;
  showAppInstall?: boolean;
  appInstallTitle?: string;
  appInstallDescription?: string;
  channels?: Array<Partial<SupportDownloadChannel> & { type?: string }>;
};

const DEFAULT_TITLE = "客服下载";
const DEFAULT_SUBTITLE = "联系客服或把商城安装到桌面";
const SUPPORT_CHANNEL_TYPES: SupportChannelType[] = ["wechat", "whatsapp", "telegram"];
const DOWNLOAD_PLATFORM_TYPES: DownloadPlatformType[] = ["desktop", "android", "ios"];

const CHANNEL_META: Record<SupportChannelType, { label: string; icon: LucideIcon; actionText: string }> = {
  wechat: { label: "微信客服", icon: QrCode, actionText: "打开微信" },
  whatsapp: { label: "WhatsApp 客服", icon: MessageCircle, actionText: "跳转 WhatsApp" },
  telegram: { label: "Telegram 客服", icon: Send, actionText: "跳转 Telegram" },
};

const PLATFORM_META: Record<DownloadPlatformType, { label: string; icon: LucideIcon }> = {
  desktop: { label: "电脑端", icon: Monitor },
  android: { label: "安卓端", icon: Smartphone },
  ios: { label: "苹果端", icon: Apple },
};

function clean(value?: string) {
  return String(value || "").trim();
}

function isIosSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
  return isIOS && isSafari;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function detectedPlatform(): DownloadPlatformType {
  if (typeof window === "undefined") return "desktop";
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

function defaultChannels(siteInfo: SiteInfo): SupportDownloadChannel[] {
  return [
    {
      id: "wechat",
      type: "wechat",
      name: "微信客服",
      enabled: true,
      account: clean(siteInfo.wechatId),
      linkUrl: "",
      qrUrl: "",
      description: "复制微信号后在微信内搜索添加，或扫码添加。",
      sortOrder: 1,
    },
    {
      id: "whatsapp",
      type: "whatsapp",
      name: "WhatsApp 客服",
      enabled: true,
      account: clean(siteInfo.contactWhatsApp),
      linkUrl: clean(siteInfo.whatsappUrl),
      qrUrl: "",
      description: "点击按钮即可跳转 WhatsApp 咨询。",
      sortOrder: 2,
    },
    {
      id: "telegram",
      type: "telegram",
      name: "Telegram 客服",
      enabled: false,
      account: "",
      linkUrl: "",
      qrUrl: "",
      description: "点击按钮即可跳转 Telegram 咨询。",
      sortOrder: 3,
    },
  ];
}

function defaultPlatforms(): DownloadPlatform[] {
  return [
    {
      id: "desktop",
      type: "desktop",
      enabled: true,
      title: "电脑端",
      description: "使用 Chrome 或 Edge 打开商城，可把商城添加到桌面快速访问。",
      buttonText: "添加到电脑桌面",
      instructions: ["使用 Chrome / Edge 打开商城。", "点击地址栏安装图标，或从浏览器菜单选择安装应用。", "按系统提示确认即可添加到桌面。"],
      sortOrder: 1,
    },
    {
      id: "android",
      type: "android",
      enabled: true,
      title: "安卓端",
      description: "安卓手机可直接安装到桌面，像 App 一样打开商城。",
      buttonText: "立即安装到桌面",
      instructions: ["使用 Chrome 打开商城。", "点击立即安装，或从浏览器菜单选择添加到主屏幕。", "按系统提示确认安装。"],
      sortOrder: 2,
    },
    {
      id: "ios",
      type: "ios",
      enabled: true,
      title: "苹果端",
      description: "iPhone 需要通过 Safari 手动添加到主屏幕。",
      buttonText: "",
      instructions: ["点击 Safari 底部分享按钮。", "选择“添加到主屏幕”。", "点击“添加”完成安装。"],
      sortOrder: 3,
    },
  ];
}

function defaultConfig(siteInfo: SiteInfo): SupportDownloadConfig {
  return {
    enabled: true,
    title: DEFAULT_TITLE,
    subtitle: DEFAULT_SUBTITLE,
    defaultTab: "support",
    support: {
      enabled: true,
      title: "客服",
      description: clean(siteInfo.supportText) || "如需咨询商品、订单、售后或安装问题，请通过下方入口联系官方客服。",
      workingHours: clean(siteInfo.businessHours) || "每天 9:00 - 22:00",
      channels: defaultChannels(siteInfo),
    },
    download: {
      enabled: true,
      title: "下载",
      description: "选择适合你的设备，把商城添加到桌面使用。",
      platforms: defaultPlatforms(),
    },
  };
}

function normalizeChannel(channel: Partial<SupportDownloadChannel> & { type?: string }, index: number): SupportDownloadChannel | null {
  const type = SUPPORT_CHANNEL_TYPES.includes(channel.type as SupportChannelType) ? (channel.type as SupportChannelType) : null;
  if (!type) return null;
  const meta = CHANNEL_META[type];
  return {
    id: clean(channel.id) || `${type}-${index}`,
    type,
    name: clean(channel.name) || meta.label,
    enabled: channel.enabled !== false,
    account: clean(channel.account),
    linkUrl: clean(channel.linkUrl),
    qrUrl: clean(channel.qrUrl),
    description: clean(channel.description),
    sortOrder: Number(channel.sortOrder) || index + 1,
  };
}

function normalizePlatform(platform: Partial<DownloadPlatform> & { type?: string }, index: number): DownloadPlatform | null {
  const type = DOWNLOAD_PLATFORM_TYPES.includes(platform.type as DownloadPlatformType) ? (platform.type as DownloadPlatformType) : null;
  if (!type) return null;
  const fallback = defaultPlatforms().find((item) => item.type === type)!;
  return {
    id: clean(platform.id) || type,
    type,
    enabled: platform.enabled !== false,
    title: clean(platform.title) || fallback.title,
    description: clean(platform.description) || fallback.description,
    buttonText: clean(platform.buttonText) || fallback.buttonText,
    instructions: Array.isArray(platform.instructions) && platform.instructions.length > 0 ? platform.instructions.map(clean).filter(Boolean) : fallback.instructions,
    sortOrder: Number(platform.sortOrder) || index + 1,
  };
}

function parseConfig(raw: string | undefined, siteInfo: SiteInfo): SupportDownloadConfig {
  const fallback = defaultConfig(siteInfo);
  if (!raw?.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw) as LegacySupportDownloadConfig;
    const legacyChannels = Array.isArray(parsed.channels) ? parsed.channels : undefined;
    const rawChannels = Array.isArray(parsed.support?.channels) ? parsed.support.channels : legacyChannels;
    const channels = rawChannels?.map(normalizeChannel).filter((item): item is SupportDownloadChannel => Boolean(item));
    const rawPlatforms = Array.isArray(parsed.download?.platforms) ? parsed.download.platforms : undefined;
    const platforms = rawPlatforms?.map(normalizePlatform).filter((item): item is DownloadPlatform => Boolean(item));

    return {
      enabled: parsed.enabled !== false,
      title: clean(parsed.title) || fallback.title,
      subtitle: clean(parsed.subtitle) || fallback.subtitle,
      defaultTab: parsed.defaultTab === "download" ? "download" : "support",
      support: {
        enabled: parsed.support?.enabled !== false,
        title: clean(parsed.support?.title) || fallback.support.title,
        description: clean(parsed.support?.description ?? parsed.supportDescription) || fallback.support.description,
        workingHours: clean(parsed.support?.workingHours ?? parsed.workingHours) || fallback.support.workingHours,
        channels: channels?.length ? channels.sort((a, b) => a.sortOrder - b.sortOrder) : fallback.support.channels,
      },
      download: {
        enabled: parsed.download?.enabled !== false && parsed.showAppInstall !== false,
        title: clean(parsed.download?.title ?? parsed.appInstallTitle) || fallback.download.title,
        description: clean(parsed.download?.description ?? parsed.appInstallDescription) || fallback.download.description,
        platforms: platforms?.length ? platforms.sort((a, b) => a.sortOrder - b.sortOrder) : fallback.download.platforms,
      },
    };
  } catch {
    return fallback;
  }
}

function channelLink(channel: SupportDownloadChannel, siteInfo: SiteInfo) {
  const link = clean(channel.linkUrl);
  if (link) return link;
  const account = clean(channel.account);
  if (channel.type === "whatsapp") {
    const configured = clean(siteInfo.whatsappUrl);
    if (configured) return configured;
    const digits = (account || clean(siteInfo.contactWhatsApp)).replace(/[^\d]/g, "");
    return digits ? `https://wa.me/${digits}` : "";
  }
  if (channel.type === "telegram") return account ? `https://t.me/${account.replace(/^@/, "")}` : "";
  return "";
}

async function copyText(text: string, message = "账号已复制") {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
    return true;
  } catch {
    toast.error("复制失败，请手动复制");
    return false;
  }
}

async function saveQrImage(url: string, name: string) {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error("download failed");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${name || "qrcode"}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    toast.success("二维码已开始保存");
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
    toast.message("已打开二维码图片，请长按保存");
  }
}

function SupportChannelCard({ channel, siteInfo }: { channel: SupportDownloadChannel; siteInfo: SiteInfo }) {
  const meta = CHANNEL_META[channel.type];
  const Icon = meta.icon;
  const account = clean(channel.account);
  const qrUrl = clean(channel.qrUrl);
  const link = channelLink(channel, siteInfo);
  if (!account && !link && !qrUrl) return null;

  const openChannel = async () => {
    if (channel.type === "wechat") {
      if (account) await copyText(account, "微信号已复制，请在微信搜索添加");
      window.location.href = "weixin://";
      return;
    }
    if (channel.type === "whatsapp") {
      void trackEvent({ event_type: "contact_whatsapp_click", module: "support_download" });
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]">
          <Icon size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-[var(--theme-text)]">{channel.name || meta.label}</h2>
          {channel.description ? <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text-muted)]">{channel.description}</p> : null}
          {account ? (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[var(--theme-bg)] px-3 py-2">
              <span className="min-w-0 truncate text-sm font-semibold text-[var(--theme-text)]">{account}</span>
              <button type="button" onClick={() => void copyText(account)} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-text)]">
                <Copy size={13} />
                复制
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {qrUrl ? (
        <div className="mt-4 flex flex-col items-center rounded-2xl bg-[var(--theme-bg)] p-4">
          <img src={qrUrl} alt={`${channel.name || meta.label}二维码`} className="h-40 w-40 rounded-xl border border-[var(--theme-border)] bg-white object-cover sm:h-44 sm:w-44" />
          <button type="button" onClick={() => void saveQrImage(qrUrl, channel.name || meta.label)} className="mt-3 inline-flex items-center gap-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-xs font-semibold text-[var(--theme-text)]">
            <Download size={13} />
            保存二维码
          </button>
        </div>
      ) : null}

      {channel.type === "wechat" || link ? (
        channel.type === "wechat" ? (
          <button type="button" onClick={() => void openChannel()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--theme-primary)] py-3 text-sm font-semibold text-[var(--theme-primary-foreground)]">
            <ExternalLink size={15} />
            {meta.actionText}
          </button>
        ) : (
          <a href={link} target="_blank" rel="noreferrer" onClick={() => void openChannel()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--theme-primary)] py-3 text-sm font-semibold text-[var(--theme-primary-foreground)]">
            <ExternalLink size={15} />
            {meta.actionText}
          </a>
        )
      ) : null}
    </section>
  );
}

function usePwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      return true;
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  return { canInstall: Boolean(deferredPrompt) && !installed, install, installing, installed };
}

function DownloadPlatformCard({ platform, pwa, recommended }: { platform: DownloadPlatform; pwa: ReturnType<typeof usePwaInstallPrompt>; recommended: boolean }) {
  const meta = PLATFORM_META[platform.type];
  const Icon = meta.icon;
  const iosSafari = isIosSafari();
  const canUsePrompt = platform.type !== "ios" && pwa.canInstall;
  const showInstallButton = platform.type !== "ios" && platform.buttonText;
  const isInstalled = pwa.installed;

  return (
    <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]">
          <Icon size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-[var(--theme-text)]">{platform.title || meta.label}</h2>
            {recommended ? <span className="rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] px-2 py-0.5 text-[10px] font-bold text-[var(--theme-primary)]">推荐</span> : null}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text-muted)]">{platform.description}</p>
        </div>
      </div>

      {isInstalled && recommended ? <p className="mt-4 rounded-xl bg-[var(--theme-bg)] px-3 py-2 text-xs font-medium text-[var(--theme-text-muted)]">当前已处于 App 模式。</p> : null}
      {showInstallButton ? (
        <button
          type="button"
          onClick={() => {
            if (canUsePrompt) {
              void pwa.install();
            } else {
              toast.message("当前浏览器暂未提供一键安装，请按下方步骤操作");
            }
          }}
          disabled={pwa.installing || isInstalled}
          className="mt-4 w-full rounded-full bg-[var(--theme-primary)] py-3 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60"
        >
          {pwa.installing ? "安装处理中..." : isInstalled ? "已安装" : platform.buttonText}
        </button>
      ) : null}

      <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-[var(--theme-text-muted)]">
        {platform.instructions.map((step, index) => (
          <li key={`${platform.id}-${index}`}>
            {platform.type === "ios" && index === 0 && iosSafari ? (
              <>
                点击 Safari 底部分享按钮 <Share2 size={13} className="mx-0.5 inline-block align-text-bottom" />。
              </>
            ) : (
              step
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function SupportTab({ config, siteInfo }: { config: SupportDownloadConfig; siteInfo: SiteInfo }) {
  const channels = useMemo(
    () =>
      [...config.support.channels]
        .filter((channel) => channel.enabled && SUPPORT_CHANNEL_TYPES.includes(channel.type) && (channel.account || channel.linkUrl || channel.qrUrl))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [config.support.channels],
  );

  return (
    <>
      {config.support.description ? <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-sm leading-relaxed text-[var(--theme-text-muted)] shadow-[var(--theme-shadow)]">{config.support.description}</section> : null}
      {channels.map((channel) => <SupportChannelCard key={channel.id} channel={channel} siteInfo={siteInfo} />)}
      {channels.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-10 text-center">
          <p className="text-sm font-semibold text-[var(--theme-text)]">暂无客服入口</p>
          <p className="mt-2 text-xs text-[var(--theme-text-muted)]">请稍后再来，或通过订单页面联系商家。</p>
        </section>
      ) : null}
    </>
  );
}

function DownloadTab({ config }: { config: SupportDownloadConfig }) {
  const pwa = usePwaInstallPrompt();
  const recommendedType = useMemo(() => detectedPlatform(), []);
  const platforms = useMemo(
    () => [...config.download.platforms].filter((platform) => platform.enabled).sort((a, b) => a.sortOrder - b.sortOrder),
    [config.download.platforms],
  );

  return (
    <>
      {config.download.description ? <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-sm leading-relaxed text-[var(--theme-text-muted)] shadow-[var(--theme-shadow)]">{config.download.description}</section> : null}
      {platforms.map((platform) => <DownloadPlatformCard key={platform.id} platform={platform} pwa={pwa} recommended={platform.type === recommendedType} />)}
      {platforms.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-10 text-center text-sm text-[var(--theme-text-muted)]">下载入口暂未启用</section>
      ) : null}
    </>
  );
}

function normalizeTab(value: string | null, fallback: SupportDownloadTab): SupportDownloadTab {
  return value === "download" || value === "support" ? value : fallback;
}

export default function SupportDownload() {
  const siteInfo = useSiteInfo();
  const [searchParams, setSearchParams] = useSearchParams();
  const config = useMemo(() => parseConfig(siteInfo.supportDownloadConfig, siteInfo), [siteInfo]);
  const activeTab = normalizeTab(searchParams.get("tab"), config.defaultTab);

  const setActiveTab = (tab: SupportDownloadTab) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="store-bottom-safe min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <SeoHead title={`${config.title || DEFAULT_TITLE}｜${siteInfo.siteName || "官方商城"}`} description={config.subtitle || DEFAULT_SUBTITLE} canonical={buildCanonical("/support-download")} robots="index,follow" />
      <PageHeader title={config.title || DEFAULT_TITLE} backFallback="/" />

      <main className="mx-auto w-full max-w-lg space-y-3 px-[var(--store-page-x)] py-[var(--store-page-y)] pb-6 sm:px-4 sm:py-4">
        <section className="overflow-hidden rounded-3xl bg-[linear-gradient(135deg,var(--theme-primary),color-mix(in_srgb,var(--theme-primary)_72%,#111827))] p-5 text-[var(--theme-primary-foreground)] shadow-[var(--theme-shadow)]">
          <p className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <Headphones size={13} />
            官方客服与下载
          </p>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{config.title || DEFAULT_TITLE}</h1>
          <p className="mt-2 text-sm leading-relaxed opacity-90">{config.subtitle || DEFAULT_SUBTITLE}</p>
          {config.support.workingHours ? (
            <p className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              <Clock size={13} />
              {config.support.workingHours}
            </p>
          ) : null}
        </section>

        {config.enabled === false ? (
          <section className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-10 text-center text-sm text-[var(--theme-text-muted)]">客服下载页暂未启用</section>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-1 shadow-[var(--theme-shadow)]">
              {(["support", "download"] as SupportDownloadTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                    activeTab === tab
                      ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
                      : "text-[var(--theme-text-muted)]"
                  }`}
                >
                  {tab === "support" ? config.support.title || "客服" : config.download.title || "下载"}
                </button>
              ))}
            </div>
            {activeTab === "support" ? <SupportTab config={config} siteInfo={siteInfo} /> : <DownloadTab config={config} />}
          </>
        )}
      </main>
    </div>
  );
}
