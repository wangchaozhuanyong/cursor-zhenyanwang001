import { describe, expect, test } from "vitest";
import { getNextSmartMobileChromeMode, type SmartMobileChromeMode } from "./useSmartMobileChrome";

const base = {
  expandTop: 16,
  compactStart: 56,
  hideStart: 148,
  hideDelta: 18,
  revealDelta: 8,
};

function next(currentMode: SmartMobileChromeMode, currentY: number, delta: number) {
  return getNextSmartMobileChromeMode({
    ...base,
    currentMode,
    currentY,
    delta,
  });
}

describe("getNextSmartMobileChromeMode", () => {
  test("does not reveal the full chrome on upward page movement before reaching the top", () => {
    expect(next("hidden", 360, -9)).toBe("hidden");
    expect(next("compact", 260, -12)).toBe("compact");
  });

  test("only restores compact or expanded chrome near the top", () => {
    expect(next("hidden", 40, -12)).toBe("compact");
    expect(next("hidden", 8, -12)).toBe("expanded");
  });

  test("hides or compacts while the user keeps browsing downward", () => {
    expect(next("expanded", 190, 22)).toBe("hidden");
    expect(next("expanded", 90, 12)).toBe("compact");
  });

  test("keeps the chrome expanded at the top", () => {
    expect(next("hidden", 8, 2)).toBe("expanded");
  });

  test("ignores tiny scroll noise in the middle of the page", () => {
    expect(next("hidden", 280, -2)).toBe("hidden");
    expect(next("compact", 280, 2)).toBe("compact");
  });
});
