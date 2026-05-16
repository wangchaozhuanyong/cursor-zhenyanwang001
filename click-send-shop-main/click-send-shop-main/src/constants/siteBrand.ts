/** 静态 favicon 缓存版本；更换 public 下图标后递增 */
export const SITE_FAVICON_VERSION = "20260517";

const v = SITE_FAVICON_VERSION;

export const DEFAULT_FAVICON_ICO = `/favicon.ico?v=${v}`;
export const DEFAULT_FAVICON_WEBP = `/favicon.webp?v=${v}`;
export const DEFAULT_FAVICON_PNG = `/favicon-32x32.png?v=${v}`;
export const DEFAULT_FAVICON_SVG = `/favicon.svg?v=${v}`;
export const DEFAULT_APPLE_TOUCH_ICON = `/apple-touch-icon.png?v=${v}`;

export const DEFAULT_OG_IMAGE = DEFAULT_FAVICON_PNG;
