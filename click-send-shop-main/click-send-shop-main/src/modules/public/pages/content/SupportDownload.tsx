import { useEffect, useMemo, useState } from "react";
import { Clock, Copy, ExternalLink, Headphones, MessageCircle, QrCode, Send, Share2, Smartphone, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import SeoHead from "@/components/SeoHead";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { buildCanonical } from "@/utils/seo";
import { trackEvent } from "@/services/analyticsService";
import type { SiteInfo, SupportChannelType, SupportDownloadChannel, SupportDownloadConfig } from "@/types/content";

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DEFAULT_TITLE = "客服下载";
const DEFAULT_SUBTITLE = "添加客服、查看二维码，并把商城安装到手机桌面";

const CHANNEL_META: Record<SupportChannelType, { label: string; icon: LucideIcon }> = {
  wechat: { label: "微信客服", icon: QrCode },
  whatsapp: { label: "WhatsApp 客服", icon: MessageCircle },
  telegram: { label: "Telegram 客服", icon: Send },
  messenger: { label: "Messenger 客服", icon: MessageCircle },
  custom: { label: "客服入口", icon: Headphones },
};

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

function clean(value?: string) {
  return String(value || "").trim();
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
  if (channel.type === "messenger") return account ? `https://m.me/${account.replace(/^@/, "")}` : "";
  return "";
}

function defaultConfig(siteInfo: SiteInfo): SupportDownloadConfig {
  const channels: SupportDownloadChannel[] = [];
  if (clean(siteInfo.wechatId)) {
    channels.push({
      id: "default_wechat",
      type: "wechat",
      name: "微信客服",
      enabled: true,
      account: clean(siteInfo.wechatId),
      linkUrl: "",
      qrUrl: "",
      description: "请复制微信号后在微信内添加客服，或扫码添加。",
      sortOrder: 1,
    });
  }
  if (clean(siteInfo.contactWhatsApp) || clean(siteInfo.whatsappUrl)) {
    channels.push({
      id: "default_whatsapp",
      type: "whatsapp",
      name: "WhatsApp 客服",
      enabled: true,
      account: clean(siteInfo.contactWhatsApp),
      linkUrl: clean(siteInfo.whatsappUrl),
      qrUrl: "",
      description: "点击按钮即可跳转 WhatsApp 咨询。",
      sortOrder: 2,
    });
  }
  return {
    enabled: true,
    title: DEFAULT_TITLE,
    subtitle: DEFAULT_SUBTITLE,
    workingHours: clean(siteInfo.businessHours) || "每天 9:00 - 22:00",
    supportDescription: clean(siteInfo.supportText) || "官方客服在线，售后无忧。",
    showAppInstall: true,
    appInstallTitle: "安装到手机桌面",
    appInstallDescription: "安装后可像 App 一样从桌面打开商城，下单、支付、订单功能保持不变。",
    channels,
  };
}

function parseConfig(raw: string | undefined, siteInfo: SiteInfo): SupportDownloadConfig {
  const fallback = defaultConfig(siteInfo);
  if (!raw?.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<SupportDownloadConfig>;
    return {
      ...fallback,
      ...parsed,
      channels: Array.isArray(parsed.channels)
        ? parsed.channels.map((channel, index) => ({
            id: clean(channel.id) || `${channel.type || "custom"}-${index}`,
            type: (channel.type || "custom") as SupportChannelType,
            name: clean(channel.name) || CHANNEL_META[(channel.type || "custom") as SupportChannelType]?.label || "客服入口",
            enabled: channel.enabled !== false,
            account: clean(channel.account),
            linkUrl: clean(channel.linkUrl),
            qrUrl: clean(channel.qrUrl),
            description: clean(channel.description),
            sortOrder: Number(channel.sortOrder) || index + 1,
          }))
        : fallback.channels,
    };
  } catch {
    return fallback;
  }
}

async function copyText(text: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast.success("账号已复制");
  } catch {
    toast.error("复制失败，请手动复制");
  }
}

function ChannelCard({ channel, siteInfo }: { channel: SupportDownloadChannel; siteInfo: SiteInfo }) {
  const meta = CHANNEL_META[channel.type] ?? CHANNEL_META.custom;
  const Icon = meta.icon;
  const link = channelLink(channel, siteInfo);
  const account = clean(channel.account);
  const qrUrl = clean(channel.qrUrl);
  const handleOpenLink = () => {
    if (channel.type === "whatsapp") {
      void trackEvent({ event_type: "contact_whatsapp_click", module: "support_download" });
    }
  };
  if (!account && !link && !qrUrl) return null;

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
                复制账号
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {qrUrl ? (
        <div className="mt-4 flex flex-col items-center rounded-2xl bg-[var(--theme-bg)] p-4">
          <img src={qrUrl} alt={`${channel.name || meta.label}二维码`} className="h-44 w-44 rounded-xl border border-[var(--theme-border)] bg-white object-cover" />
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--theme-text-muted)]">
            <QrCode size={13} />
            保存或截图后扫码添加
          </p>
        </div>
      ) : null}

      {link ? (
        <a href={link} target="_blank" rel="noreferrer" onClick={handleOpenLink} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--theme-primary)] py-3 text-sm font-semibold text-[var(--theme-primary-foreground)]">
          <ExternalLink size={15} />
          打开外部 App
        </a>
      ) : null}
    </section>
  );
}

function AppInstallModule({ title, description }: { title: string; description: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());
  const ios = useMemo(() => isIosSafari(), []);

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

  const canOneTapInstall = !!deferredPrompt && !ios && !installed;
  const installNow = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]">
          <Smartphone size={19} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[var(--theme-text)]">{title || "安装到手机桌面"}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text-muted)]">{description || "安装后可像 App 一样从桌面打开商城。"}</p>
        </div>
      </div>

      {installed ? <p className="mt-4 rounded-xl bg-[var(--theme-bg)] px-3 py-2 text-xs font-medium text-[var(--theme-text-muted)]">当前已处于 App 模式。</p> : null}
      {canOneTapInstall ? (
        <button type="button" onClick={installNow} disabled={installing} className="mt-4 w-full rounded-full bg-[var(--theme-primary)] py-3 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60">
          {installing ? "安装处理中..." : "立即安装到桌面"}
        </button>
      ) : null}
      {ios && !installed ? (
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-[var(--theme-text-muted)]">
          <li>点击 Safari 底部分享按钮 <Share2 size={13} className="mx-0.5 inline-block align-text-bottom" />。</li>
          <li>选择“添加到主屏幕”。</li>
          <li>点击“添加”完成安装。</li>
        </ol>
      ) : null}
      {!canOneTapInstall && !ios && !installed ? (
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-[var(--theme-text-muted)]">
          <li>使用 Chrome / Edge 打开商城首页。</li>
          <li>等待浏览器出现“安装应用”提示，或从浏览器菜单选择安装。</li>
          <li>按系统提示确认即可添加到桌面。</li>
        </ol>
      ) : null}
    </section>
  );
}

export default function SupportDownload() {
  const siteInfo = useSiteInfo();
  const config = useMemo(() => parseConfig(siteInfo.supportDownloadConfig, siteInfo), [siteInfo]);
  const channels = useMemo(
    () =>
      [...config.channels]
        .filter((channel) => channel.enabled && (channel.account || channel.linkUrl || channel.qrUrl))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [config.channels],
  );

  return (
    <div className="store-bottom-safe min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <SeoHead title={`${config.title || DEFAULT_TITLE}｜${siteInfo.siteName || "大马通"}`} description={config.subtitle || DEFAULT_SUBTITLE} canonical={buildCanonical("/support-download")} robots="index,follow" />
      <PageHeader title={config.title || DEFAULT_TITLE} backFallback="/" />

      <main className="mx-auto w-full max-w-lg space-y-3 px-[var(--store-page-x)] py-[var(--store-page-y)] pb-6 sm:px-4 sm:py-4">
        <section className="overflow-hidden rounded-3xl bg-[linear-gradient(135deg,var(--theme-primary),color-mix(in_srgb,var(--theme-primary)_72%,#111827))] p-5 text-[var(--theme-primary-foreground)] shadow-[var(--theme-shadow)]">
          <p className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <Headphones size={13} />
            官方客服入口
          </p>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{config.title || DEFAULT_TITLE}</h1>
          <p className="mt-2 text-sm leading-relaxed opacity-90">{config.subtitle || DEFAULT_SUBTITLE}</p>
          {config.workingHours ? (
            <p className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              <Clock size={13} />
              {config.workingHours}
            </p>
          ) : null}
        </section>

        {config.enabled === false ? (
          <section className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-10 text-center text-sm text-[var(--theme-text-muted)]">客服下载页暂未启用</section>
        ) : (
          <>
            {config.supportDescription ? <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-sm leading-relaxed text-[var(--theme-text-muted)] shadow-[var(--theme-shadow)]">{config.supportDescription}</section> : null}
            {channels.map((channel) => <ChannelCard key={channel.id} channel={channel} siteInfo={siteInfo} />)}
            {channels.length === 0 ? (
              <section className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-10 text-center">
                <p className="text-sm font-semibold text-[var(--theme-text)]">暂无客服入口</p>
                <p className="mt-2 text-xs text-[var(--theme-text-muted)]">请稍后再来，或通过订单页面联系商家。</p>
              </section>
            ) : null}
            {config.showAppInstall ? <AppInstallModule title={config.appInstallTitle} description={config.appInstallDescription} /> : null}
          </>
        )}
      </main>
    </div>
  );
}
