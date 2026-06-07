import { describe, expect, it } from "vitest";
import {
  getEnabledDownloadPlatforms,
  normalizeSupportDownloadConfig,
  parseSupportDownloadConfig,
} from "@/utils/supportDownloadConfig";

describe("supportDownloadConfig", () => {
  it("keeps the retired install tab disabled for legacy config", () => {
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

    expect(config.defaultTab).toBe("support");
    expect(config.download.enabled).toBe(false);
    expect(getEnabledDownloadPlatforms(config)).toEqual([]);
  });

  it("uses support as the default view when config is empty", () => {
    const config = parseSupportDownloadConfig("");

    expect(config.defaultTab).toBe("support");
    expect(config.download.enabled).toBe(false);
  });
});
