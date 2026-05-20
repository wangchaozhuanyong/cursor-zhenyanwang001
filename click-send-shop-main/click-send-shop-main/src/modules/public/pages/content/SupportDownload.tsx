import { useCallback, useEffect, useMemo, useRef } from "react";
import { Apple, Clock, Copy, Download, ExternalLink, Headphones, MessageCircle, Monitor, QrCode, Send, Share2, Smartphone, type LucideIcon } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import SeoHead from "@/components/SeoHead";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { buildCanonical } from "@/utils/seo";
import { trackEvent } from "@/services/analyticsService";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { detectPwaPlatform, getPwaInstallHelpText, isIosSafari } from "@/utils/pwa";
import type { AnalyticsEventPayload } from "@/services/analyticsService";
import type { DownloadPlatform, DownloadPlatformType, SiteInfo, SupportChannelType, SupportDownloadChannel, SupportDownloadConfig, SupportDownloadTab } from "@/types/content";

type LegacySupportDownloadConfig = Partial<SupportDownloadConfig> & {
  workingHours?: string;
  supportDescription?: string;
  showAppInstall?: boolean;
  appInstallTitle?: string;
  appInstallDescription?: string;
  channels?: Array<Partial<SupportDownloadChannel> & { type?: string }>;
};

const DEFAULT_TITLE = "客服与安装";
const DEFAULT_SUBTITLE = "联系客服或将商城添加到桌面，像 App 一样快速打开。";
const SUPPORT_CHANNEL_TYPES: SupportChannelType[] = ["wechat", "whatsapp", "telegram"];
const DOWNLOAD_PLATFORM_TYPES: DownloadPlatformType[] = ["desktop", "android", "ios"];

const CHANNEL_META: Record<SupportChannelType, { label: string; icon: LucideIcon; actionText: string }> = {
  wechat: { label: "微信客服", icon: QrCode, actionText: "打开微信" },
  whatsapp: { label: "WhatsApp 客服", icon: MessageCircle, actionText: "前往 WhatsApp" },
  telegram: { label: "Telegram 客服", icon: Send, actionText: "前往 Telegram" },
};

const PLATFORM_META: Record<DownloadPlatformType, { label: string; icon: LucideIcon }> = {
  desktop: { label: "电脑端", icon: Monitor },
  android: { label: "安卓端", icon: Smartphone },
  ios: { label: "苹果端", icon: Apple },
};

function clean(value?: string) {
  return String(value || "").trim();
}

function trackPwaEvent(eventType: AnalyticsEventPayload["event_type"]) {
  void trackEvent({ event_type: eventType, module: "pwa", page: "/support-download" });
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
      description: "复制微信号后在微信中搜索添加，或扫描二维码添加。",
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
      instructions: ["使用 Chrome 或 Edge 打开商城。", "点击地址栏安装图标，或从浏览器菜单选择安装应用。", "按系统提示确认即可添加到桌面。"],
      sortOrder: 1,
    },
    {
      id: "android",
      type: "android",
      enabled: true,
      title: "安卓端",
      description: "安卓手机可直接安装到桌面，像 App 一样打开商城。",
      buttonText: "立即安装",
      instructions: ["使用 Chrome 打开商城。", "点击“立即安装”，或从浏览器菜单选择“添加到主屏幕”。", "按系统提示确认安装。"],
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
    defaultTab: "download",
    support: {
      enabled: true,
      title: "联系客服",
      description: clean(siteInfo.supportText) || "如需咨询商品、订单、售后或安装问题，请通过下方入口联系客服。",
      workingHours: clean(siteInfo.businessHours) || "每天 9:00 - 22:00",
      channels: defaultChannels(siteInfo),
    },
    download: {
      enabled: true,
      title: "安装应用",
      description: "选择适合你的设备，把商城添加到桌面使用。",
      platforms: defaultPlatforms(),
    },
  };
}

function parseConfig(raw: string | undefined, siteInfo: SiteInfo): SupportDownloadConfig {
  const fallback = defaultConfig(siteInfo);
  if (!raw?.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw) as LegacySupportDownloadConfig;
    return {
      ...fallback,
      ...parsed,
      title: clean(parsed.title) || fallback.title,
      subtitle: clean(parsed.subtitle) || fallback.subtitle,
      support: {
        ...fallback.support,
        ...parsed.support,
        title: clean(parsed.support?.title) || fallback.support.title,
        description: clean(parsed.support?.description ?? parsed.supportDescription) || fallback.support.description,
        workingHours: clean(parsed.support?.workingHours ?? parsed.workingHours) || fallback.support.workingHours,
      },
      download: {
        ...fallback.download,
        ...parsed.download,
        title: clean(parsed.download?.title ?? parsed.appInstallTitle) || fallback.download.title,
        description: clean(parsed.download?.description ?? parsed.appInstallDescription) || fallback.download.description,
      },
    };
  } catch {
    return fallback;
  }
}

function normalizeTab(value: string | null, fallback: SupportDownloadTab): SupportDownloadTab {
  return value === "download" || value === "support" ? value : fallback;
}

function DownloadPlatformCard({ platform, pwa, recommended }: { platform: DownloadPlatform; pwa: ReturnType<typeof usePwaInstallPrompt>; recommended: boolean }) {
  const Icon = PLATFORM_META[platform.type]?.icon ?? Smartphone;
  const iosSafari = isIosSafari();
  const isInstalled = pwa.installed;
  const isAndroidCard = platform.type === "android" && recommended;
  const canOneTapInstall = isAndroidCard && pwa.canInstall;

  const onInstall = async () => {
    trackPwaEvent("pwa_install_button_clicked");
    if (!canOneTapInstall) {
      toast.message("当前浏览器不支持一键安装，请按下方步骤添加到主屏幕。", { duration: 3500 });
      return;
    }
    const result = await pwa.install();
    if (result === "dismissed") {
      toast.message("你已取消安装，可稍后再次点击安装。", { duration: 2500 });
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]">
          <Icon size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-[var(--theme-text)]">{platform.title}</h2>
            {recommended ? <span className="rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] px-2 py-0.5 text-[10px] font-bold text-[var(--theme-primary)]">推荐</span> : null}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text-muted)]">{platform.description}</p>
        </div>
      </div>

      {recommended && !isInstalled ? <p className="mt-4 rounded-xl bg-[var(--theme-bg)] px-3 py-2 text-xs font-medium text-[var(--theme-text-muted)]">{getPwaInstallHelpText()}</p> : null}
      {recommended && isInstalled ? <p className="mt-4 rounded-xl bg-[var(--theme-bg)] px-3 py-2 text-xs font-medium text-[var(--theme-text-muted)]">已安装，可从桌面打开。</p> : null}

      {isAndroidCard ? (
        <button
          type="button"
          onClick={() => void onInstall()}
          disabled={pwa.installing || isInstalled}
          className="mt-4 w-full rounded-full bg-[var(--theme-primary)] py-3 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60"
        >
          {pwa.installing ? "安装处理中..." : isInstalled ? "已安装" : platform.buttonText || "立即安装"}
        </button>
      ) : null}

      {platform.type === "ios" && recommended && iosSafari ? (
        <p className="mt-3 rounded-xl border border-dashed border-[var(--theme-border)] px-3 py-2 text-xs leading-relaxed text-[var(--theme-text-muted)]">
          已检测到 iOS Safari，请按下方步骤添加到主屏幕。
        </p>
      ) : null}

      <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-[var(--theme-text-muted)]">
        {(platform.instructions || []).map((step, index) => (
          <li key={`${platform.id}-${index}`}>{step}</li>
        ))}
      </ol>
    </section>
  );
}

export default function SupportDownload() {
  const siteInfo = useSiteInfo();
  const [searchParams, setSearchParams] = useSearchParams();
  const config = useMemo(() => parseConfig(siteInfo.supportDownloadConfig, siteInfo), [siteInfo]);
  const activeTab = normalizeTab(searchParams.get("tab"), config.defaultTab);

  useEffect(() => {
    trackPwaEvent("pwa_download_page_view");
  }, []);

  const handleInstalled = useCallback(() => {
    trackPwaEvent("pwa_installed");
  }, []);

  const pwa = usePwaInstallPrompt(handleInstalled);
  const installShownTrackedRef = useRef(false);
  const recommendedType = useMemo(() => detectPwaPlatform(), []);

  useEffect(() => {
    if (installShownTrackedRef.current) return;
    if (recommendedType === "android" && pwa.canInstall) {
      installShownTrackedRef.current = true;
      trackPwaEvent("pwa_install_button_shown");
    }
  }, [pwa.canInstall, recommendedType]);

  const setActiveTab = (tab: SupportDownloadTab) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const platforms = useMemo(
    () => (config.download.platforms || defaultPlatforms()).filter((p) => p.enabled !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [config.download.platforms],
  );

  return (
    <div className="store-bottom-safe min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <SeoHead title={`${config.title || DEFAULT_TITLE}｜${siteInfo.siteName || "大马通"}`} description={config.subtitle || DEFAULT_SUBTITLE} canonical={buildCanonical("/support-download")} robots="index,follow" />
      <PageHeader title={config.title || DEFAULT_TITLE} backFallback="/" />

      <main className="mx-auto w-full max-w-lg space-y-3 px-[var(--store-page-x)] py-[var(--store-page-y)] pb-6 sm:px-4 sm:py-4">
        <section className="overflow-hidden rounded-3xl bg-[linear-gradient(135deg,var(--theme-primary),color-mix(in_srgb,var(--theme-primary)_72%,#111827))] p-5 text-[var(--theme-primary-foreground)] shadow-[var(--theme-shadow)]">
          <p className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold"><Headphones size={13} /> 官方客服与安装</p>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{config.title || DEFAULT_TITLE}</h1>
          <p className="mt-2 text-sm leading-relaxed opacity-90">{config.subtitle || DEFAULT_SUBTITLE}</p>
          {config.support.workingHours ? <p className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium"><Clock size={13} /> {config.support.workingHours}</p> : null}
        </section>

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-1 shadow-[var(--theme-shadow)]">
          {(["support", "download"] as SupportDownloadTab[]).map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${activeTab === tab ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]" : "text-[var(--theme-text-muted)]"}`}>
              {tab === "support" ? "客服" : "安装"}
            </button>
          ))}
        </div>

        {activeTab === "download" ? (
          <>
            {platforms.map((platform) => <DownloadPlatformCard key={platform.id} platform={platform} pwa={pwa} recommended={platform.type === recommendedType} />)}
          </>
        ) : (
          <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
            <p className="text-sm text-[var(--theme-text-muted)]">请通过商城内客服入口联系，我们会尽快回复。</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--theme-text-muted)]">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--theme-bg)] px-3 py-1"><QrCode size={13} /> 微信</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--theme-bg)] px-3 py-1"><MessageCircle size={13} /> WhatsApp</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--theme-bg)] px-3 py-1"><Send size={13} /> Telegram</span>
            </div>
            <button type="button" onClick={() => void navigator.clipboard?.writeText(clean(siteInfo.wechatId || siteInfo.contactWhatsApp || ""))} className="mt-4 inline-flex items-center gap-1 rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-text)]"><Copy size={13} /> 复制客服账号</button>
            {clean(siteInfo.whatsappUrl) ? <a href={clean(siteInfo.whatsappUrl)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--theme-primary)]"><ExternalLink size={13} /> 前往 WhatsApp</a> : null}
          </section>
        )}
      </main>
    </div>
  );
}
