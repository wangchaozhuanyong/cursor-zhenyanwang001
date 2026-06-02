import { Apple, CheckCircle2, Copy, Info, PlusSquare, Share2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import type { DownloadPlatform } from "@/types/content";
import type { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { copyToClipboard } from "@/utils/clipboard";
import { type BrowserEnv } from "@/utils/browserEnv";
import { trackEvent } from "@/services/analyticsService";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type PwaState = ReturnType<typeof usePwaInstallPrompt>;

type Props = {
  platform: DownloadPlatform;
  browser: BrowserEnv;
  pwa: PwaState;
  recommended: boolean;
  installUrl: string;
};

const IOS_STEP_ICONS = ["share", "plus", "done"] as const;

async function copySiteLink(url: string, successMessage = "当前链接已复制") {
  if (!url) {
    toast.error("无法获取当前链接");
    return;
  }
  const ok = await copyToClipboard(url);
  if (ok) toast.success(successMessage);
  else toast.error("复制失败，请手动复制地址栏链接");
}

function getPreferredAndroidBrowserText() {
  return "请用 Android Chrome、Samsung Internet 或 Edge 打开本页。";
}

function IosGuideIcon({ icon }: { icon: (typeof IOS_STEP_ICONS)[number] }) {
  if (icon === "share") return <Share2 size={18} aria-hidden="true" />;
  if (icon === "plus") return <PlusSquare size={18} aria-hidden="true" />;
  return <CheckCircle2 size={18} aria-hidden="true" />;
}

export default function InstallPlatformCard({ platform, browser, pwa, recommended, installUrl }: Props) {
  const isAndroid = platform.type === "android";
  const isIos = platform.type === "ios";
  const Icon = isIos ? Apple : Smartphone;
  const isAndroidDevice = isAndroid && browser.isAndroid;
  const isIosDevice = isIos && browser.isIOS;
  const canOneTap = isAndroidDevice && !browser.isInAppBrowser && pwa.canInstall;
  const isCheckingOneTap = isAndroidDevice && !browser.isInAppBrowser && !pwa.installPromptChecked && !pwa.installed;
  const showAndroidFallback = isAndroidDevice && !canOneTap && !isCheckingOneTap && !pwa.installed;
  const isIosStandalone = isIosDevice && pwa.installed;
  const showIosSafariHint = isIosDevice && !browser.isSafari && !pwa.installed;
  const showIosSafariGuide = isIosDevice && !pwa.installed;
  const showDefaultInstructions = !isIosDevice;
  const showBottomCopyButton = !isIosDevice;

  const onInstall = async () => {
    if (!canOneTap) return;
    void trackEvent({ event_type: "pwa_install_button_clicked", module: "pwa", page: "/support-download" });
    const result = await pwa.install();
    if (result === "accepted") toast.success("已添加到桌面，可从手机桌面打开");
    else if (result === "dismissed") toast.message("已取消，可稍后再试");
    else toast.message("当前浏览器可能不支持自动添加，请按下方步骤手动添加到桌面。");
  };

  const title = platform.title?.trim() || (isAndroid ? "安卓手机添加到桌面" : "苹果手机添加到桌面");
  const description = platform.description?.trim() || "";
  const actionText = platform.buttonText?.trim() || (isAndroid ? "一键添加到桌面" : "复制链接，用 Safari 打开");
  const instructions = (platform.instructions || [])
    .map((step) => step.trim())
    .filter(Boolean);

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

      {isAndroidDevice && (canOneTap || pwa.installed) ? (
        <UnifiedButton type="button" onClick={() => { void onInstall(); }} disabled={pwa.installing || pwa.installed} className="support-primary-action">
          {pwa.installed ? <CheckCircle2 size={18} aria-hidden="true" /> : <Smartphone size={18} aria-hidden="true" />}
          <span>{pwa.installed ? "已添加到桌面" : pwa.installing ? "正在处理..." : actionText}</span>
        </UnifiedButton>
      ) : null}

      {isAndroidDevice && canOneTap ? (
        <p className="support-inline-hint">
          <Info size={15} aria-hidden="true" />
          <span>点击后请在浏览器确认框里选择安装，确认后桌面会生成入口。</span>
        </p>
      ) : null}

      {isAndroidDevice && isCheckingOneTap ? (
        <div className="support-notice-panel">
          正在检测当前浏览器是否支持一键添加到桌面，请稍等。
        </div>
      ) : null}

      {showAndroidFallback && browser.isInAppBrowser ? (
        <div className="support-notice-panel">
          <p className="font-semibold">当前是在 App 内打开，通常不会弹出安装确认框。</p>
          <p>{getPreferredAndroidBrowserText()}</p>
          <UnifiedButton type="button" onClick={() => { void copySiteLink(installUrl, "链接已复制，请用手机浏览器打开"); }} className="support-outline-action">
            <Copy size={15} aria-hidden="true" />
            <span>复制链接，换浏览器打开</span>
          </UnifiedButton>
        </div>
      ) : null}

      {showAndroidFallback && !browser.isInAppBrowser ? (
        <div className="support-notice-panel">
          <p className="font-semibold">当前浏览器没有提供一键安装确认框。</p>
          <p>请点浏览器右上角菜单，选择“添加到桌面 / 添加到主屏幕 / 发送到桌面”。</p>
          <p>{getPreferredAndroidBrowserText()}</p>
        </div>
      ) : null}

      {showIosSafariHint ? (
        <div className="support-notice-panel">
          <p className="font-semibold">苹果手机需要用 Safari 添加到主屏幕。</p>
          <p>请先复制链接，用 Safari 打开后再按下面 {instructions.length} 步操作。</p>
          <UnifiedButton type="button" onClick={() => { void copySiteLink(installUrl, "链接已复制，请用 Safari 打开"); }} className="support-outline-action">
            <Copy size={15} aria-hidden="true" />
            <span>{actionText}</span>
          </UnifiedButton>
        </div>
      ) : null}

      {isIosStandalone ? (
        <div className="support-installed-panel">
          <span className="support-installed-icon" aria-hidden="true">
            <CheckCircle2 size={22} />
          </span>
          <div>
            <p className="font-semibold">已从桌面 App 打开</p>
            <p>以后可以直接从 iPhone 主屏幕图标进入。</p>
          </div>
        </div>
      ) : null}

      {showIosSafariGuide ? (
        <div className="support-ios-guide" aria-label="苹果手机添加到主屏幕步骤">
          {browser.isSafari ? (
            <p className="support-inline-hint">
              <Share2 size={15} aria-hidden="true" />
              <span>请按下面 {instructions.length} 步添加，添加后可像 App 一样打开。</span>
            </p>
          ) : null}
          <div className="support-ios-step-grid">
            {instructions.map((step, index) => (
              <div key={`${platform.id}-${index}-${step}`} className="support-ios-step-card">
                <span className="support-ios-step-number">{index + 1}</span>
                <span className="support-ios-step-icon">
                  <IosGuideIcon icon={IOS_STEP_ICONS[index] || "done"} />
                </span>
                <div>
                  <p>{step}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {showDefaultInstructions ? (
        <ol className="support-install-steps">
          {instructions.map((step, index) => (
            <li key={`${platform.id}-${index}`}>{step}</li>
          ))}
        </ol>
      ) : null}

      {showBottomCopyButton ? (
        <UnifiedButton type="button" onClick={() => { void copySiteLink(installUrl); }} className="support-outline-action">
          <Copy size={15} aria-hidden="true" />
          <span>复制当前链接</span>
        </UnifiedButton>
      ) : null}
    </section>
  );
}
