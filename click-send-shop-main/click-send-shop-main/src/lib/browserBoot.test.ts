import { describe, expect, it } from "vitest";
import { installBrowserCompatShims } from "@/lib/browserBoot";
import {
  detectChinaBrowserVendor,
  getChinaBrowserCompatHint,
  isChinaChromiumShell,
  isLikelyLegacyChinaBrowserMode,
} from "@/utils/chinaBrowser";

describe("chinaBrowser", () => {
  it("detects Baidu browser UA", () => {
    expect(detectChinaBrowserVendor("Mozilla/5.0 Baidubrowser/6.0")).toBe("baidu");
  });

  it("detects WeChat in-app UA", () => {
    expect(detectChinaBrowserVendor("Mozilla/5.0 MicroMessenger/8.0")).toBe("wechat");
  });

  it("flags Trident as legacy mode", () => {
    expect(isLikelyLegacyChinaBrowserMode("Mozilla/5.0 (Windows NT 10.0; Trident/7.0)")).toBe(true);
  });

  it("returns compat hint for Baidu", () => {
    const hint = getChinaBrowserCompatHint("Mozilla/5.0 Baidubrowser/6.0 Chrome/90");
    expect(hint).toContain("极速模式");
  });

  it("treats Baidu chromium shell as chromium", () => {
    expect(isChinaChromiumShell("Mozilla/5.0 Baidubrowser/6.0 Chrome/108")).toBe(true);
  });
});

describe("installBrowserCompatShims", () => {
  it("runs without throwing and keeps Array.at usable", () => {
    expect(() => installBrowserCompatShims()).not.toThrow();
    expect(typeof [1, 2, 3].at).toBe("function");
    expect([1, 2, 3].at(-1)).toBe(3);
  });
});
