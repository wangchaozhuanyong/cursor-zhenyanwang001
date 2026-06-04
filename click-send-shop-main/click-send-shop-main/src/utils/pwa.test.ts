import { beforeEach, describe, expect, it } from "vitest";
import { getPwaInstallHelpText, isAndroidInstallCapableBrowser } from "@/utils/pwa";

function setUserAgent(ua: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
}

describe("pwa browser install help", () => {
  beforeEach(() => {
    setUserAgent("Mozilla/5.0");
  });

  it("treats Samsung Internet as Android install-capable", () => {
    setUserAgent(
      "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0 Mobile Safari/537.36",
    );

    expect(isAndroidInstallCapableBrowser()).toBe(true);
    expect(getPwaInstallHelpText()).toContain("点击安装按钮");
  });

  it("treats Android Edge as install-capable", () => {
    setUserAgent(
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 EdgA/120.0",
    );

    expect(isAndroidInstallCapableBrowser()).toBe(true);
    expect(getPwaInstallHelpText()).toContain("点击安装按钮");
  });

  it("does not treat Android WebView as install-capable", () => {
    setUserAgent(
      "Mozilla/5.0 (Linux; Android 12; Pixel 5 Build/SP1A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0 Mobile Safari/537.36 wv",
    );

    expect(isAndroidInstallCapableBrowser()).toBe(false);
    expect(getPwaInstallHelpText()).toContain("Samsung Internet");
  });

  it("does not treat Android QQ or UC shells as preferred one-tap browsers", () => {
    setUserAgent(
      "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) MQQBrowser/13.9 Chrome/100 Mobile Safari/537.36",
    );
    expect(isAndroidInstallCapableBrowser()).toBe(false);

    setUserAgent(
      "Mozilla/5.0 (Linux; U; Android 13; zh-CN) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0 Mobile Safari/537.36 UCBrowser/15.0",
    );
    expect(isAndroidInstallCapableBrowser()).toBe(false);
    expect(getPwaInstallHelpText()).toContain("Samsung Internet");
  });

  it("keeps iPhone Safari on manual Add to Home Screen guidance", () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    );

    expect(isAndroidInstallCapableBrowser()).toBe(false);
    expect(getPwaInstallHelpText()).toContain("Safari 分享按钮");
  });
});
