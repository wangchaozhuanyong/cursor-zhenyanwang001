import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, PlusSquare, Smartphone } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import SeoHead from "@/components/SeoHead";
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
import { isLegacyGenericCopy, STORE_COPY, STORE_LEGACY_GENERIC_COPY } from "@/constants/storeCopy";
import { getChannelTitle } from "@/utils/supportChannels";
import { toast } from "sonner";
import "@/styles/support-download.css";
import type { AnalyticsEventPayload } from "@/services/analyticsService";
import type { SupportChannelType, SupportDownloadChannel } from "@/types/content";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

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
  if (view === "wechat") return "微信";
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
  const canShowInstallView = browserEnv.platform !== "desktop";

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
    if (canShowInstallView && config.download.enabled !== false && platforms.length > 0) views.push("download");
    return views;
  }, [canShowInstallView, channelByType, config.download.enabled, config.support.enabled, platforms.length]);

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
  const visiblePlatforms = useMemo(() => {
    if (recommendedPlatform === "android" || recommendedPlatform === "ios") {
      return platforms.filter((platform) => platform.type === recommendedPlatform);
    }
    return platforms;
  }, [platforms, recommendedPlatform]);
  const rawPageTitle = config.title?.trim() || "";
  const pageTitle = !rawPageTitle || isLegacyGenericCopy(rawPageTitle, STORE_LEGACY_GENERIC_COPY.supportTitles)
    ? STORE_COPY.supportCenterTitle
    : rawPageTitle;
  const installPageUrl = useMemo(() => buildCanonical("/support-download", "tab=download"), []);

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
        title={`${pageTitle} - ${siteInfo.siteName || STORE_COPY.brandName}`}
        description={config.subtitle}
        canonical={buildCanonical("/support-download")}
        robots="index,follow"
      />

      <main className="support-download-shell">
        <header className="support-download-hero">
          <h1>{pageTitle}</h1>
        </header>

        {!waitingForConfiguredView && availableViews.length > 0 ? (
          <nav
            className="support-download-tabs"
            aria-label={`${STORE_COPY.supportCenterTitle}入口`}
            style={{ gridTemplateColumns: `repeat(${availableViews.length}, minmax(0, 1fr))` }}
          >
            {availableViews.map((view) => {
              const active = activeView === view;
              return (
                <UnifiedButton
                  key={view}
                  type="button"
                  onClick={() => setActiveView(view)}
                  className={`support-download-tab${active ? " is-active" : ""}`}
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
                  当前设备的添加到桌面说明未启用，请联系站点管理员。
                </section>
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
              <strong>客服渠道暂未显示</strong>
              <span>
                {canShowInstallView
                  ? "请稍后再试；如果你是管理员，请到后台客服中心页面检查客服渠道和添加桌面说明是否已启用。"
                  : "请稍后再试；如果你是管理员，请到后台客服中心页面检查微信、WhatsApp 或 Telegram 渠道是否已启用。"}
              </span>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
