import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, Clock3, Copy, PlusSquare } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import SeoHead from "@/components/SeoHead";
import StorePageHeader from "@/components/store/StorePageHeader";
import WeChatIcon from "@/components/icons/WeChatIcon";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import TelegramIcon from "@/components/icons/TelegramIcon";
import SupportChannelCard from "@/components/support/SupportChannelCard";
import InstallPlatformCard from "@/components/support/InstallPlatformCard";
import { useSiteInfo, useSiteInfoLoaded } from "@/hooks/useSiteInfo";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { buildCanonical } from "@/utils/seo";
import { trackEvent } from "@/services/analyticsService";
import { detectBrowserEnv } from "@/utils/browserEnv";
import { copyToClipboard } from "@/utils/clipboard";
import {
  getEnabledDownloadPlatforms,
  getEnabledSupportChannels,
  parseSupportDownloadConfig,
} from "@/utils/supportDownloadConfig";
import { STORE_COPY } from "@/constants/storeCopy";
import { STORE_MOBILE_PAGE_HEADER_CLASS } from "@/constants/storeLayout";
import { getChannelTitle } from "@/utils/supportChannels";
import { toast } from "sonner";
import "@/styles/support-download.css";
import type { AnalyticsEventPayload } from "@/services/analyticsService";
import type { SupportChannelType, SupportDownloadChannel } from "@/types/content";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useHorizontalActiveScroll } from "@/hooks/useHorizontalActiveScroll";
import { useGoBack } from "@/hooks/useGoBack";

type SupportDownloadView = SupportChannelType | "download";

const CHANNEL_ORDER: SupportChannelType[] = ["wechat", "whatsapp", "telegram"];

function trackPwaEvent(eventType: AnalyticsEventPayload["event_type"]) {
  void trackEvent({ event_type: eventType, module: "pwa", page: "/support-download" });
}

async function copyCurrentLink(url: string) {
  const ok = await copyToClipboard(url);
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
  return (
    <span className="support-download-tab-icon" aria-hidden="true">
      {view === "wechat" ? <WeChatIcon size={18} color="currentColor" /> : null}
      {view === "whatsapp" ? <WhatsAppIcon size={18} color="currentColor" /> : null}
      {view === "telegram" ? <TelegramIcon size={18} color="currentColor" /> : null}
      {view === "download" ? <PlusSquare size={18} strokeWidth={2.2} /> : null}
    </span>
  );
}

function getSupportTabLabel(view: SupportDownloadView) {
  if (view === "wechat") return "微信 WeChat";
  if (view === "whatsapp") return "WhatsApp";
  if (view === "telegram") return "Telegram";
  return "添加桌面";
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
  const queryTab = searchParams.get("tab");

  useEffect(() => {
    if (installShownTrackedRef.current) return;
    if (pwa.canInstall) {
      installShownTrackedRef.current = true;
      trackPwaEvent("pwa_install_button_shown");
    }
  }, [pwa.canInstall]);

  const channels = useMemo(() => getEnabledSupportChannels(config), [config]);
  const platforms = useMemo(() => getEnabledDownloadPlatforms(config), [config]);
  const canShowInstallView = config.download.enabled !== false && platforms.length > 0;
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
    if (canShowInstallView && config.download.enabled !== false && platforms.length > 0) views.push("download");
    return views;
  }, [canShowInstallView, channelByType, config.download.enabled, config.support.enabled, platforms.length]);

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
    const nextTab = queryTab === "support" && activeView !== "download" ? "support" : activeView;
    let changed = false;
    if (next.get("tab") !== nextTab) {
      next.set("tab", nextTab);
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
  }, [activeView, pinnedChannel, queryChannelId, queryTab, searchParams, setSearchParams, waitingForConfiguredView]);

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
  const visiblePlatforms = useMemo(() => {
    if (recommendedPlatform === "android" || recommendedPlatform === "ios") {
      return platforms.filter((platform) => platform.type === recommendedPlatform);
    }
    return platforms;
  }, [platforms, recommendedPlatform]);
  const pageTitle = config.title?.trim() || "";
  const displayTitle = pageTitle || STORE_COPY.supportCenterTitle;
  const workingHours = config.support.workingHours?.trim() || "客服时间以后台配置为准";
  const installPageUrl = useMemo(() => buildCanonical("/support-download", "tab=download"), []);
  const handleBack = useGoBack("/");
  const mobileHeader = (
    <StorePageHeader
      className={`${STORE_MOBILE_PAGE_HEADER_CLASS} support-download-mobile-header`}
      matchTabHeaderHeight
      centerTitle
      title={displayTitle}
      leftSlot={
        <UnifiedButton
          type="button"
          onClick={handleBack}
          aria-label="返回上一页"
          className="-ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-0 text-[var(--theme-text)] transition hover:bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] active:scale-95"
        >
          <ArrowLeft size={20} strokeWidth={2.25} aria-hidden="true" />
        </UnifiedButton>
      }
    />
  );
  const { containerRef: tabsRef, setItemRef: setTabRef, scrollToKey: scrollTabToKey } =
    useHorizontalActiveScroll<HTMLElement, HTMLButtonElement>(activeView || "", availableViews.length);

  if (!config.enabled) {
    return (
      <div className="store-page-shell store-bottom-safe store-v12-page support-download-page support-download-v12-page support-download-page--empty text-sm text-[var(--theme-text)]">
        {mobileHeader}
        <main className="support-download-shell">
          <div className="support-empty-panel">客服中心暂未开放。</div>
        </main>
      </div>
    );
  }

  return (
    <div className="store-page-shell store-bottom-safe store-v12-page support-download-page support-download-v12-page text-[var(--theme-text)]">
      <SeoHead
        title={pageTitle ? `${pageTitle} - ${siteInfo.siteName || STORE_COPY.brandName}` : siteInfo.siteName || STORE_COPY.brandName}
        description={config.subtitle}
        canonical={buildCanonical("/support-download")}
        robots="index,follow"
      />
      {mobileHeader}

      <main className="support-download-shell">
        <section className="support-download-overview" aria-label="客服服务概览">
          <article className="support-download-overview-card support-download-overview-card--value-only">
            <span className="support-download-overview-icon" aria-hidden="true">
              <Clock3 size={18} />
            </span>
            <div>
              <strong>{workingHours}</strong>
            </div>
          </article>
        </section>

        {!waitingForConfiguredView && availableViews.length > 0 ? (
          <nav
            ref={tabsRef}
            className="support-download-tabs no-scrollbar"
            aria-label={`${STORE_COPY.supportCenterTitle}入口`}
            style={{ "--support-tab-count": availableViews.length } as CSSProperties}
          >
            {availableViews.map((view) => {
              const active = activeView === view;
              return (
                <UnifiedButton
                  key={view}
                  ref={(el) => setTabRef(view, el)}
                  type="button"
                  onClick={() => {
                    scrollTabToKey(view);
                    setActiveView(view);
                  }}
                  className={`support-download-tab support-download-tab--${view}${active ? " is-active" : ""}`}
                  aria-pressed={active}
                >
                  <SupportTabIcon view={view} />
                  <span>{getSupportTabLabel(view)}</span>
                </UnifiedButton>
              );
            })}
          </nav>
        ) : null}

        <div className="support-download-content">
          {waitingForConfiguredView ? (
            <div className="support-empty-panel">正在加载客服信息...</div>
          ) : null}

          {activeChannel ? (
            <>
              <SupportChannelCard channel={{ ...activeChannel, name: getChannelTitle(activeChannel) }} />
            </>
          ) : null}

          {activeView === "download" && config.download.enabled !== false ? (
            <div className="support-install-stack">
              {browserEnv.isInAppBrowser ? (
                <div className="support-notice-panel">
                  <p className="font-semibold">当前是在 App 内打开，可能无法直接添加到桌面。</p>
                  <p>请点击右上角“...”并选择在浏览器中打开，然后继续操作。</p>
                  <UnifiedButton type="button" onClick={() => { void copyCurrentLink(installPageUrl); }} className="support-outline-action">
                    <Copy size={15} aria-hidden="true" />
                    <span>复制当前链接</span>
                  </UnifiedButton>
                </div>
              ) : null}
              {visiblePlatforms.length > 0 ? (
                visiblePlatforms.map((platform) => (
                  <InstallPlatformCard
                    key={platform.id}
                    platform={platform}
                    browser={browserEnv}
                    pwa={pwa}
                    recommended={platform.type === recommendedPlatform}
                    installUrl={installPageUrl}
                  />
                ))
              ) : (
                <section className="support-empty-panel">
                  当前设备暂不支持添加到桌面，请稍后再试。
                </section>
              )}
            </div>
          ) : null}

          {queryChannelId && !pinnedChannel ? (
            <section className="support-empty-panel">
              所选客服账号暂不可用，请返回首页后重新进入客服中心。
            </section>
          ) : null}

          {!activeView && !queryChannelId ? (
            <section className="support-empty-panel">
              <strong>客服渠道暂未显示</strong>
              <span>
                {canShowInstallView
                  ? "请稍后再试，客服渠道和添加桌面说明暂未开放。"
                  : "请稍后再试，客服渠道暂未开放。"}
              </span>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
