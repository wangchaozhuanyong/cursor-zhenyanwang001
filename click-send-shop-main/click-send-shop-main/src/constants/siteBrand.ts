/** 品牌图缓存版本；默认图标走后端动态 PWA 图标，避免继续展示打包旧 Logo。 */
export const SITE_FAVICON_VERSION = "20260517";

const v = SITE_FAVICON_VERSION;

export const DEFAULT_FAVICON_ICO = `/api/pwa/icon-192x192.png?v=${v}`;
export const DEFAULT_FAVICON_PNG = `/api/pwa/icon-192x192.png?v=${v}`;
export const DEFAULT_APPLE_TOUCH_ICON = `/apple-touch-icon.png?v=${v}`;

export const DEFAULT_OG_IMAGE = DEFAULT_FAVICON_PNG;
