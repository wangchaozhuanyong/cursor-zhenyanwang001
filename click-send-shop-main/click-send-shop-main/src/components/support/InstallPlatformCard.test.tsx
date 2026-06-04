import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import InstallPlatformCard from "@/components/support/InstallPlatformCard";
import { DEFAULT_PLATFORMS } from "@/utils/supportDownloadConfig";
import { detectBrowserEnvFromUa } from "@/utils/browserEnv";
import type { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";

type PwaState = ReturnType<typeof usePwaInstallPrompt>;

const androidPlatform = DEFAULT_PLATFORMS.find((platform) => platform.type === "android")!;
const iosPlatform = DEFAULT_PLATFORMS.find((platform) => platform.type === "ios")!;

function renderCard(ua: string, pwaPatch: Partial<PwaState>, platform = androidPlatform) {
  const pwa: PwaState = {
    hasInstallPrompt: false,
    canInstall: false,
    installPromptChecked: true,
    install: async () => "unavailable",
    installing: false,
    installed: false,
    ...pwaPatch,
  };
  return renderToStaticMarkup(
    <InstallPlatformCard
      platform={platform}
      browser={detectBrowserEnvFromUa(ua)}
      pwa={pwa}
      recommended
      installUrl="https://damatong.net/support-download?tab=download"
    />,
  );
}

describe("InstallPlatformCard browser install states", () => {
  it.each([
    [
      "Android Chrome",
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
    ],
    [
      "Samsung Internet",
      "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0 Mobile Safari/537.36",
    ],
    [
      "Android Edge",
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 EdgA/120.0",
    ],
  ])("shows one-tap install when %s provides the prompt", (_name, ua) => {
    const html = renderCard(ua, { hasInstallPrompt: true, canInstall: true });

    expect(html).toContain("一键添加到桌面");
    expect(html).toContain("点击后请在浏览器确认框里选择安装");
    expect(html).not.toContain("当前浏览器没有提供一键安装确认框");
  });

  it.each([
    [
      "Android Chrome without prompt",
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
    ],
    [
      "Android Firefox",
      "Mozilla/5.0 (Android 13; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0",
    ],
    [
      "Android UC",
      "Mozilla/5.0 (Linux; U; Android 13; zh-CN) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0 Mobile Safari/537.36 UCBrowser/15.0",
    ],
  ])("falls back to manual Android instructions for %s", (_name, ua) => {
    const html = renderCard(ua, { installPromptChecked: true });

    expect(html).toContain("当前浏览器没有提供一键安装确认框");
    expect(html).toContain("添加到桌面 / 添加到主屏幕 / 发送到桌面");
  });

  it.each([
    [
      "WeChat",
      "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 MicroMessenger/8.0",
    ],
    [
      "QQ Browser",
      "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) MQQBrowser/13.9 Chrome/100 Mobile Safari/537.36",
    ],
    [
      "Android WebView",
      "Mozilla/5.0 (Linux; Android 12; Pixel 5 Build/SP1A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0 Mobile Safari/537.36 wv",
    ],
  ])("does not show one-tap inside %s in-app browsers", (_name, ua) => {
    const html = renderCard(ua, { hasInstallPrompt: true, canInstall: true });

    expect(html).toContain("当前是在 App 内打开");
    expect(html).toContain("复制链接，换浏览器打开");
    expect(html).not.toContain("点击后请在浏览器确认框里选择安装");
  });

  it("keeps iPhone Safari on the share-sheet guide", () => {
    const html = renderCard(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      { installPromptChecked: true },
      iosPlatform,
    );

    expect(html).toContain("请按下面 3 步添加");
    expect(html).toContain("点击 Safari 底部工具栏的“分享”按钮");
    expect(html).not.toContain("一键添加到桌面");
  });

  it("tells iPhone Chrome users to reopen in Safari", () => {
    const html = renderCard(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1",
      { installPromptChecked: true },
      iosPlatform,
    );

    expect(html).toContain("苹果手机需要用 Safari 添加到主屏幕");
    expect(html).toContain("复制链接，用 Safari 打开");
  });
});
