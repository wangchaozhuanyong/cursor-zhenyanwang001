import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Clock3, Copy, PlusSquare } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
type SupportDownloadProps = {
  installMode?: boolean;
};

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

export default function SupportDownload({ installMode = false }: SupportDownloadProps) {
  const siteInfo = useSiteInfo();
  const siteInfoLoaded = useSiteInfoLoaded();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
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
  const queryTab = installMode ? "download" : searchParams.get("tab");

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
    if (installMode && availableViews.includes("download")) return "download";
    if (waitingForConfiguredView) return requestedView;
    if (pinnedChannel && availableViews.includes(pinnedChannel.type)) {
      return pinnedChannel.type;
    }
    if (requestedView && availableViews.includes(requestedView)) return requestedView;
    if (!installMode) {
      return availableViews.find((view) => view !== "download") || null;
    }
    return availableViews.includes("download") ? "download" : null;
  }, [availableViews, installMode, pinnedChannel, requestedView, waitingForConfiguredView]);

  useEffect(() => {
    if (installMode) return;
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
  }, [activeView, installMode, pinnedChannel, queryChannelId, queryTab, searchParams, setSearchParams, waitingForConfiguredView]);

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
  const displayTitle = installMode ? "安装应用" : pageTitle || STORE_COPY.supportCenterTitle;
  const displaySiteName = siteInfo.siteName?.trim() || STORE_COPY.brandName;
  const installMark = (displaySiteName.trim().charAt(0) || "大").toUpperCase();
  const workingHours = config.support.workingHours?.trim() || "客服时间以后台配置为准";
  const installStatusText = useMemo(() => {
    if (pwa.installed) return "已从桌面应用打开";
    if (browserEnv.isInAppBrowser) return "请用手机浏览器打开后添加";
    if (browserEnv.isIOS) return browserEnv.isSafari ? "Safari 可添加到主屏幕" : "iPhone 建议使用 Safari";
    if (browserEnv.isAndroid) return pwa.canInstall ? "当前浏览器支持一键添加" : "可通过浏览器菜单添加";
    return "复制链接后在手机浏览器打开";
  }, [browserEnv.isAndroid, browserEnv.isIOS, browserEnv.isInAppBrowser, browserEnv.isSafari, pwa.canInstall, pwa.installed]);
  const overviewText = installMode ? installStatusText : workingHours;
  const installPageUrl = useMemo(() => buildCanonical(installMode ? "/install" : "/support-download", installMode ? undefined : "tab=download"), [installMode]);
  const showSupportTabs = !installMode && !waitingForConfiguredView && availableViews.length > 0 && (channels.length > 0 || activeView === "download");
  const showInstallEntry = !installMode && canShowInstallView && activeView !== "download";
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
          className="support-download-back-button"
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
      <div className={`sf-next-page-shell sf-next-bottom-safe sf-next-page sf-next-route-page support-download-page sf-next-support-download-page${installMode ? " support-install-mode" : ""} support-download-page--empty`}>
        {mobileHeader}
        <main className="support-download-shell">
          <div className="support-empty-panel">客服中心暂未开放。</div>
        </main>
      </div>
    );
  }

  return (
    <div className={`sf-next-page-shell sf-next-bottom-safe sf-next-page sf-next-route-page support-download-page sf-next-support-download-page${installMode ? " support-install-mode" : ""}`}>
      <SeoHead
        title={installMode ? `安装应用 - ${siteInfo.siteName || STORE_COPY.brandName}` : pageTitle ? `${pageTitle} - ${siteInfo.siteName || STORE_COPY.brandName}` : siteInfo.siteName || STORE_COPY.brandName}
        description={config.subtitle}
        canonical={buildCanonical(installMode ? "/install" : "/support-download")}
        robots="index,follow"
      />
      {mobileHeader}

      <main className="support-download-shell">
        {installMode ? (
          <section className="support-install-identity" aria-label="应用身份">
            <span className="support-install-identity__mark" aria-hidden="true">
              {installMark}
            </span>
            <div>
              <strong>{displaySiteName}</strong>
              <span>添加到手机桌面后，可从桌面快速打开商城。</span>
            </div>
            <small>WEB APP</small>
          </section>
        ) : null}

        <section className="support-download-overview" aria-label={installMode ? "安装状态概览" : "客服服务概览"}>
          <article className="support-download-overview-card support-download-overview-card--value-only">
            <span className="support-download-overview-icon" aria-hidden="true">
              {installMode ? <PlusSquare size={18} /> : <Clock3 size={18} />}
            </span>
            <div>
              <strong>{overviewText}</strong>
            </div>
          </article>
        </section>

        {showSupportTabs ? (
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
                  <p className="support-notice-panel__title">当前是在 App 内打开，可能无法直接添加到桌面。</p>
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
              <strong>{installMode ? "当前没有可用安装方式" : "当前没有可用客服渠道"}</strong>
              <span>
                {installMode
                  ? "后台配置添加桌面或下载指引后会显示在这里。你也可以先进入帮助中心查看常见问题。"
                  : "后台配置客服二维码或账号后会显示在这里。你也可以先进入帮助中心查看常见问题。"}
              </span>
              <div className="support-empty-actions">
                <UnifiedButton type="button" onClick={() => navigate("/help")} className="support-outline-action">
                  返回帮助中心
                </UnifiedButton>
              </div>
            </section>
          ) : null}

          {showInstallEntry ? (
            <section className="support-install-entry" aria-label="安装入口">
              <span className="support-install-entry__icon" aria-hidden="true">
                <PlusSquare size={18} />
              </span>
              <div>
                <strong>添加到手机桌面</strong>
                <span>像 App 一样快速打开商城，不影响当前客服渠道配置。</span>
              </div>
              <UnifiedButton type="button" onClick={() => setActiveView("download")} className="support-install-entry__button">
                <span>查看方法</span>
                <ArrowRight size={16} aria-hidden="true" />
              </UnifiedButton>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
