import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Headphones } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import SeoHead from "@/components/SeoHead";
import SupportChannelCard from "@/components/support/SupportChannelCard";
import InstallPlatformCard from "@/components/support/InstallPlatformCard";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { buildCanonical } from "@/utils/seo";
import { trackEvent } from "@/services/analyticsService";
import { detectBrowserEnv } from "@/utils/browserEnv";
import {
  getEnabledDownloadPlatforms,
  getEnabledSupportChannels,
  normalizeSupportDownloadTab,
  parseSupportDownloadConfig,
} from "@/utils/supportDownloadConfig";
import type { AnalyticsEventPayload } from "@/services/analyticsService";
import type { SupportDownloadTab } from "@/types/content";

function trackPwaEvent(eventType: AnalyticsEventPayload["event_type"]) {
  void trackEvent({ event_type: eventType, module: "pwa", page: "/support-download" });
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

  if (!config.enabled) {
    return (
      <div className="store-bottom-safe min-h-screen bg-[var(--theme-bg)] px-[var(--store-page-x)] py-[var(--store-page-y)] text-sm text-[var(--theme-text-muted)]">
        客服与安装页面暂未开放。
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
        <section className="flex flex-col items-center overflow-hidden rounded-3xl bg-[linear-gradient(135deg,var(--theme-primary),color-mix(in_srgb,var(--theme-primary)_72%,#111827))] p-5 text-center text-[var(--theme-primary-foreground)] shadow-[var(--theme-shadow)]">
          <p className="inline-flex items-center justify-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <Headphones size={13} />
            官方客服与安装
          </p>
          <h1 className="mt-4 w-full text-2xl font-extrabold tracking-tight">{config.title}</h1>
          <p className="mt-2 w-full text-sm leading-relaxed opacity-90">{config.subtitle}</p>
          <div
            className="mt-4 h-7 w-[min(100%,18rem)] rounded-full bg-white/15"
            aria-hidden
          />
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
              {tab === "support" ? config.support.title || "客服" : config.download.title || "安装"}
            </button>
          ))}
        </div>

        {activeTab === "support" && config.support.enabled !== false ? (
          <div className="space-y-3">
            {config.support.description ? (
              <p className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-sm leading-relaxed text-[var(--theme-text-muted)]">
                {config.support.description}
              </p>
            ) : null}
            {channels.length > 0 ? (
              channels.map((channel) => <SupportChannelCard key={channel.id} channel={channel} />)
            ) : (
              <section className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 text-center text-sm text-[var(--theme-text-muted)]">
                暂未配置客服渠道，请联系站点管理员在后台添加。
              </section>
            )}
          </div>
        ) : null}

        {activeTab === "download" && config.download.enabled !== false ? (
          <div className="space-y-3">
            <p className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-sm leading-relaxed text-[var(--theme-text-muted)]">
              <Download size={14} className="mr-1 inline" />
              {config.download.description}
            </p>
            {platforms.map((platform) => (
              <InstallPlatformCard
                key={platform.id}
                platform={platform}
                browser={browserEnv}
                pwa={pwa}
                recommended={platform.type === recommendedPlatform}
              />
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}
