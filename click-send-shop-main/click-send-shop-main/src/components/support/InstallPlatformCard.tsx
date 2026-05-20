import { useEffect, useRef } from "react";
import { Apple, Copy, Monitor, Share2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import type { DownloadPlatform, DownloadPlatformType } from "@/types/content";
import type { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { copyToClipboard } from "@/utils/clipboard";
import { type BrowserEnv, getPublicSiteUrl } from "@/utils/browserEnv";
import { trackEvent } from "@/services/analyticsService";

const PLATFORM_ICONS: Record<DownloadPlatformType, typeof Smartphone> = {
  desktop: Monitor,
  android: Smartphone,
  ios: Apple,
};

type PwaState = ReturnType<typeof usePwaInstallPrompt>;

type Props = {
  platform: DownloadPlatform;
  browser: BrowserEnv;
  pwa: PwaState;
  recommended: boolean;
};

async function copySiteLink() {
  const url = getPublicSiteUrl();
  if (!url) {
    toast.error("无法获取网站链接");
    return;
  }
  const ok = await copyToClipboard(url);
  if (ok) toast.success("网站链接已复制");
  else toast.error("复制失败，请手动复制地址栏链接");
}

export default function InstallPlatformCard({ platform, browser, pwa, recommended }: Props) {
  const Icon = PLATFORM_ICONS[platform.type] ?? Smartphone;
  const isInstalled = pwa.installed;

  const canAndroidOneTap = platform.type === "android"
    && browser.isAndroid
    && browser.isChrome
    && !browser.isInAppBrowser
    && pwa.canInstall;

  const canDesktopOneTap = platform.type === "desktop"
    && browser.isDesktopChromium
    && !browser.isInAppBrowser
    && pwa.canInstall;

  const showAndroidChromeHint = platform.type === "android"
    && browser.isAndroid
    && (browser.isInAppBrowser || !browser.isChrome);

  const showIosSafariGuide = platform.type === "ios"
    && browser.isIOS
    && browser.isSafari
    && !browser.isInAppBrowser;

  const showIosOpenSafariHint = platform.type === "ios"
    && browser.isIOS
    && (!browser.isSafari || browser.isInAppBrowser);

  const iosGuideTrackedRef = useRef(false);
  useEffect(() => {
    if (iosGuideTrackedRef.current) return;
    if (showIosSafariGuide || showIosOpenSafariHint) {
      iosGuideTrackedRef.current = true;
      void trackEvent({ event_type: "pwa_ios_guide_shown", module: "pwa", page: "/support-download" });
    }
  }, [showIosSafariGuide, showIosOpenSafariHint]);

  const onInstall = async () => {
    void trackEvent({ event_type: "pwa_install_button_clicked", module: "pwa", page: "/support-download" });
    if (!canAndroidOneTap && !canDesktopOneTap) {
      toast.message("当前浏览器不支持一键安装，请按下方步骤操作。", { duration: 3500 });
      return;
    }
    const result = await pwa.install();
    if (result === "accepted") {
      toast.success("安装成功，可从桌面打开商城");
    } else if (result === "dismissed") {
      toast.message("你已取消安装，可稍后再次尝试。", { duration: 2500 });
    } else {
      toast.error("当前环境无法唤起安装，请按步骤手动添加");
    }
  };

  const installButtonLabel = platform.type === "desktop"
    ? (platform.buttonText || "安装到电脑桌面")
    : (platform.buttonText || "一键安装到桌面");

  return (
    <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]">
          <Icon size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-[var(--theme-text)]">{platform.title}</h2>
            {recommended ? (
              <span className="rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] px-2 py-0.5 text-[10px] font-bold text-[var(--theme-primary)]">
                当前设备
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text-muted)]">{platform.description}</p>
        </div>
      </div>

      {isInstalled ? (
        <p className="mt-4 rounded-xl bg-[var(--theme-bg)] px-3 py-2 text-xs font-medium text-[var(--theme-text-muted)]">
          已安装，可从桌面或主屏幕打开商城。
        </p>
      ) : null}

      {canAndroidOneTap || canDesktopOneTap ? (
        <button
          type="button"
          onClick={() => { void onInstall(); }}
          disabled={pwa.installing || isInstalled}
          className="mt-4 w-full rounded-full bg-[var(--theme-primary)] py-3 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60"
        >
          {pwa.installing ? "安装处理中..." : isInstalled ? "已安装" : installButtonLabel}
        </button>
      ) : null}

      {showAndroidChromeHint ? (
        <div className="mt-4 space-y-2 rounded-xl border border-dashed border-[var(--theme-border)] px-3 py-3 text-xs leading-relaxed text-[var(--theme-text-muted)]">
          <p className="font-semibold text-[var(--theme-text)]">请使用 Chrome 打开</p>
          <p>当前为内置浏览器或非 Chrome 环境，无法一键安装。请复制链接后到 Chrome 打开。</p>
          <button
            type="button"
            onClick={() => { void copySiteLink(); }}
            className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-text)]"
          >
            <Copy size={13} />
            复制网站链接
          </button>
        </div>
      ) : null}

      {showIosOpenSafariHint ? (
        <div className="mt-4 space-y-2 rounded-xl border border-dashed border-[var(--theme-border)] px-3 py-3 text-xs leading-relaxed text-[var(--theme-text-muted)]">
          <p className="font-semibold text-[var(--theme-text)]">请使用 Safari 打开</p>
          <p>iPhone 仅支持在 Safari 中「添加到主屏幕」，内置浏览器无法一键安装。</p>
          <button
            type="button"
            onClick={() => { void copySiteLink(); }}
            className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-text)]"
          >
            <Copy size={13} />
            复制网站链接
          </button>
        </div>
      ) : null}

      {showIosSafariGuide ? (
        <p className="mt-3 inline-flex items-center gap-1 rounded-xl border border-dashed border-[var(--theme-border)] px-3 py-2 text-xs leading-relaxed text-[var(--theme-text-muted)]">
          <Share2 size={13} />
          已检测到 iOS Safari，请按下方步骤添加到主屏幕。
        </p>
      ) : null}

      {(platform.instructions || []).length > 0 ? (
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-[var(--theme-text-muted)]">
          {platform.instructions.map((step, index) => (
            <li key={`${platform.id}-${index}`}>{step}</li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
