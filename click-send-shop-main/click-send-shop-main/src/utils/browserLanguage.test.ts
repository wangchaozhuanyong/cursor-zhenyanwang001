import { describe, expect, it } from "vitest";
import { isChineseBrowserLanguage } from "./browserLanguage";

describe("isChineseBrowserLanguage", () => {
  it("accepts zh-CN / zh-TW / zh-HK / zh", () => {
    expect(isChineseBrowserLanguage(["zh-CN"])).toBe(true);
    expect(isChineseBrowserLanguage(["zh-TW", "en-US"])).toBe(true);
    expect(isChineseBrowserLanguage(["zh-HK"])).toBe(true);
    expect(isChineseBrowserLanguage(["zh"])).toBe(true);
  });

  it("accepts Cantonese (yue) for HK/Macau users", () => {
    expect(isChineseBrowserLanguage(["yue-Hant-HK"])).toBe(true);
  });

  it("rejects English-only browsers", () => {
    expect(isChineseBrowserLanguage(["en-US"])).toBe(false);
    expect(isChineseBrowserLanguage(["en-GB", "ms-MY"])).toBe(false);
  });

  it("rejects empty language list", () => {
    expect(isChineseBrowserLanguage([])).toBe(false);
  });
});
