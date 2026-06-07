import { describe, expect, it } from "vitest";
import {
  getEnabledDownloadPlatforms,
  normalizeSupportDownloadConfig,
  parseSupportDownloadConfig,
} from "@/utils/supportDownloadConfig";

describe("supportDownloadConfig", () => {
  it("keeps the install tab enabled when config enables it", () => {
    const config = normalizeSupportDownloadConfig({
      defaultTab: "download",
      download: {
        enabled: true,
        title: "Install",
        description: "Install guide",
        platforms: [
          {
            id: "android",
            type: "android",
            enabled: true,
            title: "Android",
            description: "Android guide",
            buttonText: "Install",
            instructions: ["Open menu", "Add to home screen"],
            sortOrder: 1,
          },
        ],
      },
    });

    expect(config.defaultTab).toBe("download");
    expect(config.download.enabled).toBe(true);
    expect(getEnabledDownloadPlatforms(config).map((platform) => platform.type)).toEqual(["android"]);
  });

  it("keeps the install tab disabled when config disables it", () => {
    const config = normalizeSupportDownloadConfig({
      download: {
        enabled: false,
        platforms: [],
      },
    });

    expect(config.defaultTab).toBe("support");
    expect(config.download.enabled).toBe(false);
    expect(getEnabledDownloadPlatforms(config)).toEqual([]);
  });

  it("uses support as the default view when config is empty", () => {
    const config = parseSupportDownloadConfig("");

    expect(config.defaultTab).toBe("support");
    expect(config.title).toBe("");
    expect(config.subtitle).toBe("");
    expect(config.support.description).toBe("");
    expect(config.support.channels).toEqual([]);
    expect(config.download.enabled).toBe(false);
    expect(config.download.title).toBe("");
    expect(config.download.description).toBe("");
    expect(config.download.platforms).toEqual([]);
    expect(getEnabledDownloadPlatforms(config)).toEqual([]);
  });

  it("does not replace cleared text fields with built-in copy", () => {
    const config = normalizeSupportDownloadConfig({
      title: "",
      subtitle: "",
      support: {
        enabled: true,
        description: "",
        workingHours: "",
        channels: [
          {
            id: "wechat-1",
            type: "wechat",
            name: "",
            enabled: true,
            account: "damatong",
            linkUrl: "",
            qrUrl: "",
            description: "",
            sortOrder: 1,
          },
        ],
      },
      download: {
        enabled: true,
        title: "",
        description: "",
        platforms: [
          {
            id: "android",
            type: "android",
            enabled: true,
            title: "",
            description: "",
            buttonText: "",
            instructions: [],
            sortOrder: 1,
          },
        ],
      },
    });

    expect(config.title).toBe("");
    expect(config.subtitle).toBe("");
    expect(config.support.description).toBe("");
    expect(config.support.channels[0]?.name).toBe("");
    expect(config.support.channels[0]?.description).toBe("");
    expect(config.download.title).toBe("");
    expect(config.download.description).toBe("");
    expect(config.download.platforms[0]?.title).toBe("");
    expect(config.download.platforms[0]?.description).toBe("");
    expect(config.download.platforms[0]?.buttonText).toBe("");
    expect(config.download.platforms[0]?.instructions).toEqual([]);
  });
});
