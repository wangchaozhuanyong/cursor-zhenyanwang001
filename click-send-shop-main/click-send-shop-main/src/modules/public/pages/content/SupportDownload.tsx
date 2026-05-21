import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Smartphone } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import StorePageHeader from "@/components/store/StorePageHeader";
import SeoHead from "@/components/SeoHead";
import SupportChannelCard from "@/components/support/SupportChannelCard";
import InstallPlatformCard from "@/components/support/InstallPlatformCard";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { buildCanonical } from "@/utils/seo";
import { trackEvent } from "@/services/analyticsService";
import { detectBrowserEnv, getPublicSiteUrl } from "@/utils/browserEnv";
import { copyToClipboard } from "@/utils/clipboard";
import {
  getEnabledDownloadPlatforms,
  getEnabledSupportChannels,
  parseSupportDownloadConfig,
} from "@/utils/supportDownloadConfig";
import { getChannelTitle } from "@/utils/supportChannels";
import { toast } from "sonner";
import type { AnalyticsEventPayload } from "@/services/analyticsService";
import type { SupportChannelType, SupportDownloadChannel } from "@/types/content";

type SupportDownloadView = SupportChannelType | "download";

const CHANNEL_LABELS: Record<SupportChannelType, string> = {
  wechat: "WeChat",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
};

const CHANNEL_ORDER: SupportChannelType[] = ["wechat", "whatsapp", "telegram"];

function trackPwaEvent(eventType: AnalyticsEventPayload["event_type"]) {
  void trackEvent({ event_type: eventType, module: "pwa", page: "/support-download" });
}

async function copyCurrentLink() {
  const ok = await copyToClipboard(getPublicSiteUrl());
  if (ok) toast.success("当前链接已复制");
  else toast.error("复制失败，请手动复制地址栏链接");
}

function resolveQueryView(value: string | null): SupportDownloadView | null {
  if (value === "download") return "download";
  if (value === "wechat" || value === "whatsapp" || value === "telegram") return value;
  return null;
}

function getDefaultView(
  queryTab: string | null,
  availableViews: SupportDownloadView[],
  legacyDefault: "support" | "download",
): SupportDownloadView | null {
  const requested = resolveQueryView(queryTab);
  if (requested && availableViews.includes(requested)) return requested;
  if (queryTab === "support" || legacyDefault === "support") {
    const firstChannel = availableViews.find((view) => view !== "download");
    if (firstChannel) return firstChannel;
  }
  if (legacyDefault === "download" && availableViews.includes("download")) return "download";
  return availableViews[0] || null;
}

function firstChannelByType(channels: SupportDownloadChannel[], type: SupportChannelType) {
  return channels.find((channel) => channel.type === type);
}

export default function SupportDownload() {
  const siteInfo = useSiteInfo();
  const [searchParams, setSearchParams] = useSearchParams();
  const config = useMemo(
    () => parseSupportDownloadConfig(siteInfo.supportDownloadConfig, siteInfo),
    [siteInfo],
  );

  const [browserEnv, setBrowserEnv] = useState(() => detectBrowserEnv());

  useEffect(() => {
    setBrowserEnv(detectBrowserEnv());
  }, []);

  useEffect(() => {
    trackPwaEvent("pwa_download_page_view");
  }, []);

  const handleInstalled = useCallback(() => {
    trackPwaEvent("pwa_installed");
  }, []);

  const pwa = usePwaInstallPrompt(handleInstalled);
  const installShownTrackedRef = useRef(false);

  useEffect(() => {
    if (installShownTrackedRef.current) return;
    if (pwa.canInstall) {
      installShownTrackedRef.current = true;
      trackPwaEvent("pwa_install_button_shown");
    }
  }, [pwa.canInstall]);

  const channels = useMemo(() => getEnabledSupportChannels(config), [config]);
  const platforms = useMemo(() => getEnabledDownloadPlatforms(config), [config]);
  const channelByType = useMemo(
    () => ({
      wechat: firstChannelByType(channels, "wechat"),
      whatsapp: firstChannelByType(channels, "whatsapp"),
      telegram: firstChannelByType(channels, "telegram"),
    }),
    [channels],
  );

  const availableViews = useMemo<SupportDownloadView[]>(() => {
    const views: SupportDownloadView[] = [];
    if (config.support.enabled !== false) {
      CHANNEL_ORDER.forEach((type) => {
        if (channelByType[type]) views.push(type);
      });
    }
    if (config.download.enabled !== false) views.push("download");
    return views;
  }, [channelByType, config.download.enabled, config.support.enabled]);

  const queryTab = searchParams.get("tab");
  const queryChannelId = searchParams.get("channelId")?.trim() || "";
  const pinnedChannel = useMemo(
    () => (queryChannelId ? channels.find((channel) => channel.id === queryChannelId) : undefined),
    [channels, queryChannelId],
  );

  const activeView = useMemo(() => {
    if (pinnedChannel && availableViews.includes(pinnedChannel.type)) {
      return pinnedChannel.type;
    }
    return getDefaultView(queryTab, availableViews, config.defaultTab);
  }, [availableViews, config.defaultTab, pinnedChannel, queryTab]);

  useEffect(() => {
    if (!activeView) return;
    const next = new URLSearchParams(searchParams);
    let changed = false;
    if (next.get("tab") !== activeView) {
      next.set("tab", activeView);
      changed = true;
    }
    if (pinnedChannel) {
      if (next.get("channelId") !== pinnedChannel.id) {
        next.set("channelId", pinnedChannel.id);
        changed = true;
      }
    } else if (queryChannelId) {
      next.delete("channelId");
      changed = true;
    }
    if (changed) setSearchParams(next, { replace: true });
  }, [activeView, pinnedChannel, queryChannelId, searchParams, setSearchParams]);

  const setActiveView = (view: SupportDownloadView) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", view);
    next.delete("channelId");
    setSearchParams(next, { replace: true });
  };

  const activeChannel = useMemo(() => {
    if (pinnedChannel) return pinnedChannel;
    if (activeView && activeView !== "download") return channelByType[activeView];
    return undefined;
  }, [activeView, channelByType, pinnedChannel]);
  const recommendedPlatform = browserEnv.platform;

  if (!config.enabled) {
    return (
      <div className="store-page-shell bg-[var(--theme-bg)] px-[var(--store-page-x)] py-[var(--store-page-y)] text-sm text-[var(--theme-text-muted)]">
        客服中心暂未开放。
      </div>
    );
  }

  return (
    <div className="store-page-shell store-bottom-safe bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <SeoHead
        title={`${config.title} - ${siteInfo.siteName || "官方商城"}`}
        description={config.subtitle}
        canonical={buildCanonical("/support-download")}
        robots="index,follow"
      />
      <StorePageHeader title={config.title} centerTitle />

      <main className="mx-auto w-full max-w-lg space-y-3 px-[var(--store-page-x)] py-[var(--store-page-y)] pb-6 sm:px-4 sm:py-4">
        {availableViews.length > 0 ? (
          <div
            className="grid gap-2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-1 shadow-[var(--theme-shadow)]"
            style={{ gridTemplateColumns: `repeat(${availableViews.length}, minmax(0, 1fr))` }}
          >
            {availableViews.map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                className={`min-h-11 rounded-xl px-2 py-2 text-xs font-bold transition sm:text-sm ${
                  activeView === view
                    ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
                    : "text-[var(--theme-text-muted)]"
                }`}
              >
                {view === "download" ? "添加桌面" : CHANNEL_LABELS[view]}
              </button>
            ))}
          </div>
        ) : null}

        {activeChannel ? (
          <SupportChannelCard channel={{ ...activeChannel, name: getChannelTitle(activeChannel) }} />
        ) : null}

        {activeView === "download" && config.download.enabled !== false ? (
          <div className="space-y-3">
            <p className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-sm leading-relaxed text-[var(--theme-text-muted)]">
              <Smartphone size={14} className="mr-1 inline" />
              {config.download.description || "可将商城添加到手机桌面，像 App 一样快速打开。"}
            </p>
            {browserEnv.isInAppBrowser ? (
              <div className="space-y-3 rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-sm leading-relaxed text-[var(--theme-text-muted)]">
                <p className="font-semibold text-[var(--theme-text)]">当前是在 App 内打开，可能无法直接添加到桌面。</p>
                <p>请点击右上角“...”并选择在浏览器中打开，然后继续操作。</p>
                <button type="button" onClick={() => { void copyCurrentLink(); }} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm font-semibold text-[var(--theme-text)]">
                  <Copy size={14} />
                  复制当前链接
                </button>
              </div>
            ) : null}
            {browserEnv.platform === "desktop" ? (
              <section className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 text-center shadow-[var(--theme-shadow)]">
                <h2 className="text-lg font-bold text-[var(--theme-text)]">请使用手机打开本页面</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--theme-text-muted)]">
                  本功能主要用于手机添加到桌面。请用安卓手机或苹果手机打开本页面。
                </p>
                <button type="button" onClick={() => { void copyCurrentLink(); }} className="mt-4 inline-flex min-h-10 items-center gap-1 rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm font-semibold text-[var(--theme-text)]">
                  <Copy size={14} />
                  复制当前链接
                </button>
              </section>
            ) : (
              platforms.map((platform) => (
                <InstallPlatformCard
                  key={platform.id}
                  platform={platform}
                  browser={browserEnv}
                  pwa={pwa}
                  recommended={platform.type === recommendedPlatform}
                />
              ))
            )}
          </div>
        ) : null}

        {queryChannelId && !pinnedChannel ? (
          <section className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 text-center text-sm text-[var(--theme-text-muted)]">
            所选客服账号不存在或已停用，请返回首页重试或联系站点管理员。
          </section>
        ) : null}

        {!activeView && !queryChannelId ? (
          <section className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 text-center text-sm text-[var(--theme-text-muted)]">
            暂未配置客服渠道或添加到桌面说明，请稍后再试。
          </section>
        ) : null}
      </main>
    </div>
  );
}
