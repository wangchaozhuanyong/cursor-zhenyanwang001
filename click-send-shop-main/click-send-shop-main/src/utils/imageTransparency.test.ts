import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clusterBorderBackgroundColors, ensureTransparentIconFile } from "./imageTransparency";

vi.mock("@/utils/aiBackgroundRemoval", () => ({
  removeBackgroundWithAi: vi.fn(),
}));

let imageDataQueue: ImageData[] = [];
let lastCanvasImageData: ImageData | null = null;

beforeEach(async () => {
  imageDataQueue = [];
  lastCanvasImageData = null;

  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:icon-test");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  vi.stubGlobal("Image", MockImageElement);
  mockCanvas();

  const aiModule = await import("@/utils/aiBackgroundRemoval");
  vi.mocked(aiModule.removeBackgroundWithAi).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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

describe("ensureTransparentIconFile", () => {
  it("uses fast edge matte before loading AI for solid border icons", async () => {
    imageDataQueue = [createIconImageData()];

    const aiModule = await import("@/utils/aiBackgroundRemoval");
    const progress: string[] = [];

    const result = await ensureTransparentIconFile(new File(["icon"], "icon.jpg", { type: "image/jpeg" }), {
      onProgress: (message) => progress.push(message),
    });

    expect(result.autoMatted).toBe(true);
    expect(result.method).toBe("edge");
    expect(vi.mocked(aiModule.removeBackgroundWithAi)).not.toHaveBeenCalled();
    expect(progress.some((message) => message.includes("快速"))).toBe(true);
  });
});

function maxDelta(a: [number, number, number], b: [number, number, number]) {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

function matchesPalette(rgb: [number, number, number], palette: [number, number, number][]) {
  return palette.some((c) => maxDelta(rgb, c) <= 20);
}

class MockImageElement {
  decoding = "async";
  naturalWidth = 4;
  naturalHeight = 4;
  width = 4;
  height = 4;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

function mockCanvas() {
  const originalCreateElement = document.createElement.bind(document);

  vi.spyOn(document, "createElement").mockImplementation((tagName: string, options?: ElementCreationOptions) => {
    if (tagName.toLowerCase() !== "canvas") {
      return originalCreateElement(tagName, options);
    }

    const canvas = originalCreateElement("canvas") as HTMLCanvasElement;
    const context = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn(() => cloneImageData(imageDataQueue.shift() ?? lastCanvasImageData ?? createIconImageData())),
      putImageData: vi.fn((imageData: ImageData) => {
        lastCanvasImageData = cloneImageData(imageData);
      }),
    };

    Object.defineProperty(canvas, "getContext", {
      value: () => context,
    });
    Object.defineProperty(canvas, "toBlob", {
      value: (callback: BlobCallback) => callback(new Blob(["png"], { type: "image/png" })),
    });

    return canvas;
  });
}

function createIconImageData() {
  const width = 4;
  const height = 4;
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const onBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const rgb: [number, number, number] = onBorder ? [255, 255, 255] : [200, 160, 40];
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = 255;
    }
  }

  return createTestImageData(data, width, height);
}

function cloneImageData(imageData: ImageData) {
  return createTestImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
}

function createTestImageData(data: Uint8ClampedArray, width: number, height: number) {
  return {
    data,
    width,
    height,
    colorSpace: "srgb",
  } as ImageData;
}
