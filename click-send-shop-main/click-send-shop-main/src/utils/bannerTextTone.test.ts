import { describe, expect, it } from "vitest";
import {
  getBannerCopyToneFromLuminance,
  getBannerCopyToneFromPixels,
} from "@/utils/bannerTextTone";

function pixels(values: Array<[number, number, number]>): Uint8ClampedArray {
  const data = new Uint8ClampedArray(values.length * 4);
  values.forEach(([r, g, b], index) => {
    data[index * 4] = r;
    data[index * 4 + 1] = g;
    data[index * 4 + 2] = b;
    data[index * 4 + 3] = 255;
  });
  return data;
}

describe("bannerTextTone", () => {
  it("uses dark text for bright banner regions", () => {
    expect(getBannerCopyToneFromLuminance(0.72, 0.9)).toBe("dark");
    expect(getBannerCopyToneFromPixels(pixels([
      [246, 240, 224],
      [235, 226, 206],
      [255, 250, 238],
    ]))).toBe("dark");
  });

  it("uses light text for dark banner regions", () => {
    expect(getBannerCopyToneFromLuminance(0.28, 0.1)).toBe("light");
    expect(getBannerCopyToneFromPixels(pixels([
      [16, 28, 24],
      [34, 41, 38],
      [45, 34, 26],
    ]))).toBe("light");
  });
});
