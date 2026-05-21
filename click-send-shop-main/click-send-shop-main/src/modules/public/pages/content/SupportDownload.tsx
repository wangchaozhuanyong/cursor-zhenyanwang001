import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Headphones, Smartphone, Copy } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
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
  normalizeSupportDownloadTab,
  parseSupportDownloadConfig,
} from "@/utils/supportDownloadConfig";
import { getChannelTitle } from "@/utils/supportChannels";
import { toast } from "sonner";
import type { AnalyticsEventPayload } from "@/services/analyticsService";
import type { SupportDownloadTab } from "@/types/content";

function trackPwaEvent(eventType: AnalyticsEventPayload["event_type"]) {
  void trackEvent({ event_type: eventType, module: "pwa", page: "/support-download" });
}

async function copyCurrentLink() {
  const ok = await copyToClipboard(getPublicSiteUrl());
  if (ok) toast.success("当前链接已复制");
  else toast.error("复制失败，请手动复制地址栏链接");
}

export default function SupportDownload() {
  const siteInfo = useSiteInfo();
  const [searchParams, setSearchParams] = useSearchParams();
  const config = useMemo(
    () => parseSupportDownloadConfig(siteInfo.supportDownloadConfig, siteInfo),
    [siteInfo],
  );

  const defaultTab: SupportDownloadTab = config.defaultTab === "download" ? "download" : "support";
  const queryTab = searchParams.get("tab");
  const activeTab = normalizeSupportDownloadTab(queryTab, defaultTab);

  const [browserEnv, setBrowserEnv] = useState(() => detectBrowserEnv());
  const [activeChannelId, setActiveChannelId] = useState("");

  useEffect(() => {
    setBrowserEnv(detectBrowserEnv());
  }, []);

  useEffect(() => {
    if (queryTab === "support" || queryTab === "download") return;
    const next = new URLSearchParams(searchParams);
    next.set("tab", defaultTab);
    setSearchParams(next, { replace: true });
  }, [defaultTab, queryTab, searchParams, setSearchParams]);

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

  const setActiveTab = (tab: SupportDownloadTab) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const channels = useMemo(() => getEnabledSupportChannels(config), [config]);
  const platforms = useMemo(() => getEnabledDownloadPlatforms(config), [config]);
  const recommendedPlatform = browserEnv.platform;

  useEffect(() => {
    if (!channels.length) {
      setActiveChannelId("");
      return;
    }
    if (channels.some((channel) => channel.id === activeChannelId)) return;
    const wechat = channels.find((channel) => channel.type === "wechat");
    setActiveChannelId((wechat || channels[0]).id);
  }, [activeChannelId, channels]);

  const activeChannel = channels.find((channel) => channel.id === activeChannelId) || channels[0];

  if (!config.enabled) {
    return (
      <div className="store-bottom-safe min-h-screen bg-[var(--theme-bg)] px-[var(--store-page-x)] py-[var(--store-page-y)] text-sm text-[var(--theme-text-muted)]">
        客服中心暂未开放。
      </div>
    );
  }

  return (
    <div className="store-bottom-safe min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <SeoHead
        title={`${config.title}｜${siteInfo.siteName || "官方商城"}`}
        description={config.subtitle}
        canonical={buildCanonical("/support-download")}
        robots="index,follow"
      />
      <PageHeader title={config.title} backFallback="/" />

      <main className="mx-auto w-full max-w-lg space-y-3 px-[var(--store-page-x)] py-[var(--store-page-y)] pb-6 sm:px-4 sm:py-4">
        <section className="overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 text-center shadow-[var(--theme-shadow)]">
          <p className="inline-flex items-center justify-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_14%,var(--theme-surface))] px-3 py-1 text-xs font-semibold text-[var(--theme-primary)]">
            <Headphones size={13} />
            官方客服
          </p>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[var(--theme-text)]">{config.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--theme-text-muted)]">{config.subtitle}</p>
        </section>

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
              {tab === "support" ? "联系客服" : "添加到桌面"}
            </button>
          ))}
        </div>

        {activeTab === "support" && config.support.enabled !== false ? (
          <div className="space-y-3">
            <p className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-sm leading-relaxed text-[var(--theme-text-muted)]">
              {config.support.description || "请选择下方官方客服渠道咨询商品、订单、售后或使用问题。"}
            </p>
            {channels.length > 0 ? (
              <>
                <div className="flex gap-2 overflow-x-auto rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-2 shadow-[var(--theme-shadow)]">
                  {channels.map((channel) => (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => setActiveChannelId(channel.id)}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                        activeChannel?.id === channel.id
                          ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
                          : "border border-[var(--theme-border)] text-[var(--theme-text)]"
                      }`}
                    >
                      {channel.type === "wechat" ? "WeChat" : channel.type === "whatsapp" ? "WhatsApp" : "Telegram"}
                    </button>
                  ))}
                </div>
                {activeChannel ? <SupportChannelCard channel={{ ...activeChannel, name: getChannelTitle(activeChannel) }} /> : null}
              </>
            ) : (
              <section className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 text-center text-sm text-[var(--theme-text-muted)]">
                暂未配置客服渠道，请稍后再试。
              </section>
            )}
          </div>
        ) : null}

        {activeTab === "download" && config.download.enabled !== false ? (
          <div className="space-y-3">
            <p className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-sm leading-relaxed text-[var(--theme-text-muted)]">
              <Smartphone size={14} className="mr-1 inline" />
              {config.download.description || "可将商城添加到手机桌面，像 App 一样快速打开。"}
            </p>
            {browserEnv.isInAppBrowser ? (
              <div className="space-y-3 rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-sm leading-relaxed text-[var(--theme-text-muted)]">
                <p className="font-semibold text-[var(--theme-text)]">当前是在 App 内打开，可能无法直接添加到桌面。</p>
                <p>请点击右上角“...”，选择“在浏览器中打开”，然后继续操作。</p>
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
      </main>
    </div>
  );
}
