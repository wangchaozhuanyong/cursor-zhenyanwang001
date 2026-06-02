import { afterEach, describe, expect, it } from "vitest";
import {
  appendBrandAssetVersion,
  buildSiteFaviconLinkTargets,
  guessFaviconMime,
  parseStoredSiteFaviconUrl,
  rememberSiteFaviconUrl,
  resolveSiteFaviconUrl,
  SITE_BRAND_FAVICON_STORAGE_KEY,
} from "./siteBrandAssets";

const defaults = {
  svg: "/favicon.svg?v=default",
  png: "/favicon-32x32.png?v=default",
  ico: "/favicon.ico?v=default",
  appleTouchIcon: "/apple-touch-icon.png?v=default",
};

describe("siteBrandAssets", () => {
  afterEach(() => {
    window.localStorage.removeItem(SITE_BRAND_FAVICON_STORAGE_KEY);
  });

  it("uses favicon first and falls back to logo for browser tabs", () => {
    expect(resolveSiteFaviconUrl({ faviconUrl: "/favicon.png", logoUrl: "/logo.png" })).toBe("/favicon.png");
    expect(resolveSiteFaviconUrl({ faviconUrl: " ", logoUrl: "/logo.png" })).toBe("/logo.png");
  });

  it("adds a stable query version to non-data brand assets", () => {
    const versioned = appendBrandAssetVersion("/api/pwa/icon-192x192.png", "/uploads/favicon.png");

    expect(versioned).toMatch(/^\/api\/pwa\/icon-192x192\.png\?v=/);
    expect(appendBrandAssetVersion("data:image/png;base64,abc")).toBe("data:image/png;base64,abc");
    expect(appendBrandAssetVersion("/uploads/favicon.png?v=already")).toBe("/uploads/favicon.png?v=already");
  });

  it("detects favicon mime after query params are added", () => {
    expect(guessFaviconMime("/uploads/favicon.png?v=123")).toBe("image/png");
    expect(guessFaviconMime("/uploads/favicon.webp?v=123")).toBe("image/webp");
    expect(guessFaviconMime("/uploads/favicon.svg?v=123")).toBe("image/svg+xml");
  });

  it("uses a png fallback for webp favicons", () => {
    const links = buildSiteFaviconLinkTargets({ faviconUrl: "/uploads/favicon.webp", logoUrl: "" }, defaults);

    expect(links[0]).toMatchObject({ rel: "icon", type: "image/webp", sizes: "192x192" });
    expect(links[0].href).toMatch(/^\/uploads\/favicon\.webp\?v=/);
    expect(links[1]).toMatchObject({
      rel: "icon",
      href: expect.stringMatching(/^\/api\/pwa\/icon-192x192\.png\?v=/),
      type: "image/png",
      sizes: "192x192",
    });
    expect(links[2]).toMatchObject({ rel: "shortcut icon", type: "image/png" });
    expect(links[3]).toMatchObject({ rel: "apple-touch-icon", type: "image/png", sizes: "180x180" });
  });

  it("marks svg favicons as scalable", () => {
    const links = buildSiteFaviconLinkTargets({ faviconUrl: "/uploads/favicon.svg", logoUrl: "" }, defaults);

    expect(links[0]).toMatchObject({ rel: "icon", type: "image/svg+xml", sizes: "any" });
  });

  it("uses default icons only when no custom favicon or logo exists", () => {
    expect(buildSiteFaviconLinkTargets({ faviconUrl: "", logoUrl: "" }, defaults)).toEqual([
      { rel: "icon", href: defaults.svg, type: "image/svg+xml" },
      { rel: "icon", href: defaults.png, type: "image/png", sizes: "32x32" },
      { rel: "shortcut icon", href: defaults.ico },
      { rel: "apple-touch-icon", href: defaults.appleTouchIcon },
    ]);
  });

  it("remembers and clears the last custom favicon for early page reloads", () => {
    const now = Date.now();
    rememberSiteFaviconUrl({ faviconUrl: "/uploads/favicon.png", logoUrl: "" });
    const stored = window.localStorage.getItem(SITE_BRAND_FAVICON_STORAGE_KEY);

    expect(parseStoredSiteFaviconUrl(stored, now)).toMatch(/^\/uploads\/favicon\.png\?v=/);
    expect(parseStoredSiteFaviconUrl("/uploads/legacy.png", now)).toBe("");

    rememberSiteFaviconUrl({ faviconUrl: "", logoUrl: "" });
    expect(window.localStorage.getItem(SITE_BRAND_FAVICON_STORAGE_KEY)).toBeNull();
  });
});
