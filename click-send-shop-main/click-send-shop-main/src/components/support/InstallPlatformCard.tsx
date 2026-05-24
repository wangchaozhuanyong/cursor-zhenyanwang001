import { Apple, Copy, Share2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import type { DownloadPlatform } from "@/types/content";
import type { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { copyToClipboard } from "@/utils/clipboard";
import { type BrowserEnv, getPublicSiteUrl } from "@/utils/browserEnv";
import { trackEvent } from "@/services/analyticsService";

type PwaState = ReturnType<typeof usePwaInstallPrompt>;

type Props = {
  platform: DownloadPlatform;
  browser: BrowserEnv;
  pwa: PwaState;
  recommended: boolean;
};

async function copySiteLink(successMessage = "当前链接已复制") {
  const url = getPublicSiteUrl();
  if (!url) {
    toast.error("无法获取当前链接");
    return;
  }
  const ok = await copyToClipboard(url);
  if (ok) toast.success(successMessage);
  else toast.error("复制失败，请手动复制地址栏链接");
}

export default function InstallPlatformCard({ platform, browser, pwa, recommended }: Props) {
  if (platform.type === "desktop") return null;

  const isAndroid = platform.type === "android";
  const isIos = platform.type === "ios";
  const Icon = isIos ? Apple : Smartphone;
  const canOneTap = isAndroid && browser.isAndroid && !browser.isInAppBrowser && pwa.canInstall;
  const showIosSafariHint = isIos && browser.isIOS && !browser.isSafari;

  const onInstall = async () => {
    void trackEvent({ event_type: "pwa_install_button_clicked", module: "pwa", page: "/support-download" });
    if (!canOneTap) return;
    const result = await pwa.install();
    if (result === "accepted") toast.success("已添加到桌面，可从手机桌面打开");
    else if (result === "dismissed") toast.message("已取消，可稍后再试");
    else toast.message("当前浏览器可能不支持自动添加，请按下方步骤手动添加到桌面。");
  };

  const title = platform.title?.trim() || (isAndroid ? "安卓手机添加到桌面" : "苹果手机添加到桌面");
  const description = platform.description?.trim() || "";

  return (
    <section className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 shadow-[var(--theme-shadow)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--theme-primary)_14%,var(--theme-surface))] text-[var(--theme-primary)]">
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-[var(--theme-text)]">{title}</h2>
            {recommended ? (
              <span className="rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_14%,var(--theme-surface))] px-2 py-0.5 text-[10px] font-bold text-[var(--theme-primary)]">
                当前设备
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-[var(--theme-text-muted)]">{description}</p>
          ) : null}
        </div>
      </div>

      {isAndroid && canOneTap ? (
        <button type="button" onClick={() => { void onInstall(); }} disabled={pwa.installing || pwa.installed} className="mt-5 w-full rounded-full bg-[var(--theme-primary)] py-3 text-sm font-semibold text-[var(--theme-primary-foreground)] disabled:opacity-60">
          {pwa.installed ? "已添加到桌面" : pwa.installing ? "正在处理..." : "一键添加到桌面"}
        </button>
      ) : null}

      {isAndroid && !canOneTap ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-3 text-sm leading-relaxed text-[var(--theme-text-muted)]">
          当前浏览器可能不支持自动添加，请按下方步骤手动添加到桌面。
        </div>
      ) : null}

      {showIosSafariHint ? (
        <div className="mt-5 space-y-3 rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-3 text-sm leading-relaxed text-[var(--theme-text-muted)]">
          <p className="font-semibold text-[var(--theme-text)]">当前浏览器可能无法直接添加到苹果手机桌面。</p>
          <p>请复制链接后，用 Safari 浏览器打开。</p>
          <button type="button" onClick={() => { void copySiteLink("链接已复制，请用 Safari 打开"); }} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm font-semibold text-[var(--theme-text)]">
            <Copy size={14} />
            复制链接，用 Safari 打开
          </button>
        </div>
      ) : null}

      {isIos && browser.isIOS && browser.isSafari ? (
        <p className="mt-4 inline-flex items-center gap-1 rounded-2xl border border-dashed border-[var(--theme-border)] px-3 py-2 text-xs leading-relaxed text-[var(--theme-text-muted)]">
          <Share2 size={13} />
          请按下方步骤添加到主屏幕。
        </p>
      ) : null}

      <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--theme-text-muted)]">
        {(platform.instructions || []).map((step, index) => (
          <li key={`${platform.id}-${index}`}>{step}</li>
        ))}
      </ol>

      <button type="button" onClick={() => { void copySiteLink(); }} className="mt-5 inline-flex min-h-10 items-center gap-1 rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm font-semibold text-[var(--theme-text)]">
        <Copy size={14} />
        复制当前链接
      </button>
    </section>
  );
}
