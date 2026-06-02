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

  it("does not treat Android WebView as install-capable", () => {
    setUserAgent(
      "Mozilla/5.0 (Linux; Android 12; Pixel 5 Build/SP1A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0 Mobile Safari/537.36 wv",
    );

    expect(isAndroidInstallCapableBrowser()).toBe(false);
    expect(getPwaInstallHelpText()).toContain("Samsung Internet");
  });
});
