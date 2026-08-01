import { describe, expect, it } from "vitest";

import { assessBannerImageDimensions } from "./bannerImageValidation";

describe("assessBannerImageDimensions", () => {
  it("accepts the recommended mobile and desktop sizes", () => {
    expect(assessBannerImageDimensions(
      { width: 1472, height: 800 },
      "image_mobile",
      true,
    ).level).toBe("ok");
    expect(assessBannerImageDimensions(
      { width: 1600, height: 600 },
      "image_desktop",
      true,
    ).level).toBe("ok");
  });

  it("warns when the aspect ratio is correct but resolution is too low", () => {
    const result = assessBannerImageDimensions(
      { width: 736, height: 400 },
      "image_mobile",
      true,
    );

    expect(result.level).toBe("warning");
    expect(result.code).toBe("resolution_low");
    expect(result.message).toContain("1472×800");
  });

  it("blocks a mismatched ratio only when strict ratio checking is enabled", () => {
    expect(assessBannerImageDimensions(
      { width: 1200, height: 1200 },
      "image_desktop",
      false,
    ).level).toBe("warning");
    expect(assessBannerImageDimensions(
      { width: 1200, height: 1200 },
      "image_desktop",
      true,
    ).level).toBe("error");
  });

  it("validates the fixed 16:7 category banner slot", () => {
    expect(assessBannerImageDimensions(
      { width: 1200, height: 525 },
      "category_banner",
      false,
    ).level).toBe("ok");
    expect(assessBannerImageDimensions(
      { width: 1200, height: 480 },
      "category_banner",
      false,
    ).code).toBe("ratio_mismatch");
  });
});
