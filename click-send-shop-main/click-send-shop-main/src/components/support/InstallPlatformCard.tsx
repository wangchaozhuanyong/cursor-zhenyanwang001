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
    <section className="support-install-card">
      <div className="support-install-card-head">
        <span className="support-install-icon" aria-hidden="true">
          <Icon size={20} />
        </span>
        <div>
          <div className="support-install-title-row">
            <h2>{title}</h2>
            {recommended ? (
              <span>
                当前设备
              </span>
            ) : null}
          </div>
          {description ? (
            <p>{description}</p>
          ) : null}
        </div>
      </div>

      {isAndroid && canOneTap ? (
        <button type="button" onClick={() => { void onInstall(); }} disabled={pwa.installing || pwa.installed} className="support-primary-action">
          {pwa.installed ? "已添加到桌面" : pwa.installing ? "正在处理..." : "一键添加到桌面"}
        </button>
      ) : null}

      {isAndroid && !canOneTap ? (
        <div className="support-notice-panel">
          当前浏览器可能不支持自动添加，请按下方步骤手动添加到桌面。
        </div>
      ) : null}

      {showIosSafariHint ? (
        <div className="support-notice-panel">
          <p className="font-semibold">当前浏览器可能无法直接添加到苹果手机桌面。</p>
          <p>请复制链接后，用 Safari 浏览器打开。</p>
          <button type="button" onClick={() => { void copySiteLink("链接已复制，请用 Safari 打开"); }} className="support-outline-action">
            <Copy size={15} aria-hidden="true" />
            <span>复制链接，用 Safari 打开</span>
          </button>
        </div>
      ) : null}

      {isIos && browser.isIOS && browser.isSafari ? (
        <p className="support-inline-hint">
          <Share2 size={15} aria-hidden="true" />
          <span>请按下方步骤添加到主屏幕。</span>
        </p>
      ) : null}

      <ol className="support-install-steps">
        {(platform.instructions || []).map((step, index) => (
          <li key={`${platform.id}-${index}`}>{step}</li>
        ))}
      </ol>

      <button type="button" onClick={() => { void copySiteLink(); }} className="support-outline-action">
        <Copy size={15} aria-hidden="true" />
        <span>复制当前链接</span>
      </button>
    </section>
  );
}
