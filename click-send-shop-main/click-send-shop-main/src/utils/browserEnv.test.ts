import { describe, expect, it } from "vitest";
import { detectBrowserEnvFromUa } from "@/utils/browserEnv";

describe("detectBrowserEnvFromUa", () => {
  it("treats Samsung Internet as a normal Android browser, not an in-app WebView", () => {
    const env = detectBrowserEnvFromUa(
      "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0 Mobile Safari/537.36",
    );

    expect(env.platform).toBe("android");
    expect(env.browserName).toBe("samsung");
    expect(env.isSamsungInternet).toBe(true);
    expect(env.isInAppBrowser).toBe(false);
  });

  it("treats Android Chrome and Edge as normal Android browsers", () => {
    const chrome = detectBrowserEnvFromUa(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
    );
    expect(chrome.platform).toBe("android");
    expect(chrome.browserName).toBe("chrome");
    expect(chrome.isInAppBrowser).toBe(false);

    const edge = detectBrowserEnvFromUa(
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 EdgA/120.0",
    );
    expect(edge.platform).toBe("android");
    expect(edge.browserName).toBe("edge");
    expect(edge.isInAppBrowser).toBe(false);
  });

  it("detects Malaysia common desktop Edge and Firefox browsers", () => {
    expect(
      detectBrowserEnvFromUa(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Edg/120.0",
      ).browserName,
    ).toBe("edge");
    expect(
      detectBrowserEnvFromUa("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0")
        .browserName,
    ).toBe("firefox");
  });

  it("keeps WeChat and QQ browser detection for China in-app scenarios", () => {
    expect(
      detectBrowserEnvFromUa(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0",
      ).browserName,
    ).toBe("wechat");
    expect(
      detectBrowserEnvFromUa(
        "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) MQQBrowser/13.9 Chrome/100 Mobile Safari/537.36",
      ).browserName,
    ).toBe("qq");
  });

  it("detects Android WebView as an in-app browser even when UA only exposes wv", () => {
    const env = detectBrowserEnvFromUa(
      "Mozilla/5.0 (Linux; Android 12; Pixel 5 Build/SP1A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0 Mobile Safari/537.36 wv",
    );

    expect(env.platform).toBe("android");
    expect(env.isInAppBrowser).toBe(true);
    expect(env.browserName).toBe("chrome");
  });

  it("keeps iPhone Safari and iPhone Chrome on iOS-specific paths", () => {
    const safari = detectBrowserEnvFromUa(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    );
    expect(safari.platform).toBe("ios");
    expect(safari.browserName).toBe("safari");
    expect(safari.isInAppBrowser).toBe(false);

    const chrome = detectBrowserEnvFromUa(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1",
    );
    expect(chrome.platform).toBe("ios");
    expect(chrome.browserName).toBe("chrome");
    expect(chrome.isInAppBrowser).toBe(false);
  });
});
