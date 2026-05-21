import { describe, expect, it } from "vitest";
import { clusterBorderBackgroundColors } from "./imageTransparency";

describe("clusterBorderBackgroundColors", () => {
  it("groups checkerboard border tones into a small palette", () => {
    const width = 4;
    const height = 4;
    const data = new Uint8ClampedArray(width * height * 4);
    const light: [number, number, number] = [254, 254, 254];
    const dark: [number, number, number] = [248, 248, 248];
    const gold: [number, number, number] = [200, 160, 40];

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const onBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
        const inCenter = x === 1 && y === 1;
        const rgb = inCenter ? gold : onBorder ? ((x + y) % 2 === 0 ? light : dark) : gold;
        const i = (y * width + x) * 4;
        data[i] = rgb[0];
        data[i + 1] = rgb[1];
        data[i + 2] = rgb[2];
        data[i + 3] = 255;
      }
    }

    const palette = clusterBorderBackgroundColors(data, width, height);
    expect(palette.length).toBeGreaterThanOrEqual(1);
    expect(palette.length).toBeLessThanOrEqual(4);
    expect(palette.some((c) => maxDelta(c, light) <= 20 || maxDelta(c, dark) <= 20)).toBe(true);
    expect(palette.every((c) => maxDelta(c, gold) > 20)).toBe(true);
    expect(matchesPalette(light, palette) && matchesPalette(dark, palette)).toBe(true);
  });
});

function maxDelta(a: [number, number, number], b: [number, number, number]) {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

function matchesPalette(rgb: [number, number, number], palette: [number, number, number][]) {
  return palette.some((c) => maxDelta(rgb, c) <= 20);
}
