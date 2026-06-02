import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, MessageCircle, PlusSquare, Send, Smartphone } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import SeoHead from "@/components/SeoHead";
import SupportChannelCard from "@/components/support/SupportChannelCard";
import InstallPlatformCard from "@/components/support/InstallPlatformCard";
import { useSiteInfo, useSiteInfoLoaded } from "@/hooks/useSiteInfo";
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

function SupportTabIcon({ view }: { view: SupportDownloadView }) {
  if (view === "telegram") return <Send size={19} aria-hidden="true" />;
  if (view === "download") return <PlusSquare size={19} aria-hidden="true" />;
  if (view === "whatsapp") return <MessageCircle size={19} aria-hidden="true" />;
  return <MessageCircle size={19} aria-hidden="true" />;
}

function getViewLabel(view: SupportDownloadView) {
  return view === "download" ? "添加桌面" : CHANNEL_LABELS[view];
}

export default function SupportDownload() {
  const siteInfo = useSiteInfo();
  const siteInfoLoaded = useSiteInfoLoaded();
  const [searchParams, setSearchParams] = useSearchParams();
  const config = useMemo(
    () => parseSupportDownloadConfig(siteInfo.supportDownloadConfig),
    [siteInfo.supportDownloadConfig],
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
  const requestedView = resolveQueryView(queryTab);
  const queryChannelId = searchParams.get("channelId")?.trim() || "";
  const pinnedChannel = useMemo(
    () => (queryChannelId ? channels.find((channel) => channel.id === queryChannelId) : undefined),
    [channels, queryChannelId],
  );
  const waitingForConfiguredView = !siteInfoLoaded && Boolean((requestedView && requestedView !== "download") || queryChannelId);

  const activeView = useMemo(() => {
    if (waitingForConfiguredView) return requestedView;
    if (pinnedChannel && availableViews.includes(pinnedChannel.type)) {
      return pinnedChannel.type;
    }
    return getDefaultView(queryTab, availableViews, config.defaultTab);
  }, [availableViews, config.defaultTab, pinnedChannel, queryTab, requestedView, waitingForConfiguredView]);

  useEffect(() => {
    if (waitingForConfiguredView) return;
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
  }, [activeView, pinnedChannel, queryChannelId, searchParams, setSearchParams, waitingForConfiguredView]);

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
  const pageTitle = config.title?.trim() || "客服与安装";
  const pageSubtitle = config.subtitle?.trim();

  if (!config.enabled) {
    return (
      <div className="store-page-shell support-download-page support-download-page--empty px-[var(--store-page-x)] py-[var(--store-page-y)] text-sm">
        <div className="support-empty-panel">客服中心暂未开放。</div>
      </div>
    );
  }

  return (
    <div className="store-page-shell store-bottom-safe support-download-page text-[var(--theme-text)]">
      <SeoHead
        title={`${pageTitle} - ${siteInfo.siteName || "官方商城"}`}
        description={config.subtitle}
        canonical={buildCanonical("/support-download")}
        robots="index,follow"
      />

      <main className="support-download-shell">
        <header className="support-download-hero">
          <div className="support-title-row">
            <span className="support-title-line" aria-hidden="true" />
            <span className="support-title-diamond" aria-hidden="true" />
            <h1>{pageTitle}</h1>
            <span className="support-title-diamond" aria-hidden="true" />
            <span className="support-title-line" aria-hidden="true" />
          </div>
          {pageSubtitle ? <p className="support-download-subtitle">{pageSubtitle}</p> : null}
        </header>

        {!waitingForConfiguredView && availableViews.length > 0 ? (
          <nav
            className="support-download-tabs"
            aria-label="客服与安装入口"
            style={{ gridTemplateColumns: `repeat(${availableViews.length}, minmax(0, 1fr))` }}
          >
            {availableViews.map((view) => {
              const active = activeView === view;
              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => setActiveView(view)}
                  className={`support-download-tab${active ? " is-active" : ""}`}
                  aria-pressed={active}
                >
                  <SupportTabIcon view={view} />
                  <span>{getViewLabel(view)}</span>
                </button>
              );
            })}
          </nav>
        ) : null}

        <div className="support-download-content">
          {waitingForConfiguredView ? (
            <div className="support-empty-panel">正在加载客服信息...</div>
          ) : null}

          {activeChannel ? (
            <SupportChannelCard channel={{ ...activeChannel, name: getChannelTitle(activeChannel) }} />
          ) : null}

          {activeView === "download" && config.download.enabled !== false ? (
            <div className="support-install-stack">
              {config.download.description ? (
                <p className="support-install-intro">
                  <Smartphone size={16} aria-hidden="true" />
                  <span>{config.download.description}</span>
                </p>
              ) : null}
              {browserEnv.isInAppBrowser ? (
                <div className="support-notice-panel">
                  <p className="font-semibold">当前是在 App 内打开，可能无法直接添加到桌面。</p>
                  <p>请点击右上角“...”并选择在浏览器中打开，然后继续操作。</p>
                  <button type="button" onClick={() => { void copyCurrentLink(); }} className="support-outline-action">
                    <Copy size={15} aria-hidden="true" />
                    <span>复制当前链接</span>
                  </button>
                </div>
              ) : null}
              {browserEnv.platform === "desktop" ? (
                <section className="support-install-desktop-card">
                  <div className="support-install-desktop-icon">
                    <Smartphone size={30} aria-hidden="true" />
                  </div>
                  <h2>请使用手机打开本页面</h2>
                  <p>本功能主要用于手机添加到桌面。请用安卓手机或苹果手机打开本页面。</p>
                  <button type="button" onClick={() => { void copyCurrentLink(); }} className="support-outline-action">
                    <Copy size={15} aria-hidden="true" />
                    <span>复制当前链接</span>
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
            <section className="support-empty-panel">
              所选客服账号不存在或已停用，请返回首页重试或联系站点管理员。
            </section>
          ) : null}

          {!activeView && !queryChannelId ? (
            <section className="support-empty-panel">
              暂未配置客服渠道或添加到桌面说明，请稍后再试。
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
