import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { shouldSkipRoutePreload } from "./routePreloadPolicy";

type RestoreFn = () => void;

let restoreFns: RestoreFn[] = [];

function defineValue(target: object, key: string, value: unknown) {
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, {
    configurable: true,
    value,
  });
  restoreFns.push(() => {
    if (descriptor) {
      Object.defineProperty(target, key, descriptor);
    } else {
      delete (target as Record<string, unknown>)[key];
    }
  });
}

beforeEach(() => {
  defineValue(document, "visibilityState", "visible");
  defineValue(window, "screen", { width: 390, height: 844 });
  defineValue(navigator, "maxTouchPoints", 1);
  defineValue(navigator, "deviceMemory", undefined);
  defineValue(navigator, "hardwareConcurrency", 8);
  defineValue(navigator, "connection", undefined);
  defineValue(navigator, "mozConnection", undefined);
  defineValue(navigator, "webkitConnection", undefined);
});

afterEach(() => {
  restoreFns.reverse().forEach((restore) => restore());
  restoreFns = [];
});

describe("shouldSkipRoutePreload", () => {
  it("skips idle route preloads on small touch screens when network quality is unknown", () => {
    expect(shouldSkipRoutePreload("idle")).toBe(true);
    expect(shouldSkipRoutePreload("intent")).toBe(false);
    expect(shouldSkipRoutePreload("immediate")).toBe(false);
  });

  it("skips idle route preloads on small touch screens even when network looks fast", () => {
    defineValue(navigator, "connection", { effectiveType: "4g" });

    expect(shouldSkipRoutePreload("idle")).toBe(true);
    expect(shouldSkipRoutePreload("intent")).toBe(false);
    expect(shouldSkipRoutePreload("immediate")).toBe(false);
  });

  it("skips non-immediate preloads on constrained devices", () => {
    defineValue(navigator, "hardwareConcurrency", 4);

    expect(shouldSkipRoutePreload("idle")).toBe(true);
    expect(shouldSkipRoutePreload("intent")).toBe(true);
    expect(shouldSkipRoutePreload("immediate")).toBe(false);
  });

  it("honors browser save-data for every preload priority", () => {
    defineValue(navigator, "connection", { saveData: true });

    expect(shouldSkipRoutePreload("idle")).toBe(true);
    expect(shouldSkipRoutePreload("intent")).toBe(true);
    expect(shouldSkipRoutePreload("immediate")).toBe(true);
  });
});
