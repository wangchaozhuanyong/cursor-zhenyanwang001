/** 品牌图缓存版本；浏览器标签默认使用透明 favicon，PWA 安装图标由后端动态生成。 */
export const SITE_FAVICON_VERSION = "20260526";

const v = SITE_FAVICON_VERSION;

export const DEFAULT_FAVICON_SVG = `/favicon.svg?v=${v}`;
export const DEFAULT_FAVICON_ICO = `/favicon.ico?v=${v}`;
export const DEFAULT_FAVICON_PNG = `/favicon-32x32.png?v=${v}`;
export const DEFAULT_APPLE_TOUCH_ICON = `/apple-touch-icon.png?v=${v}`;

export const DEFAULT_OG_IMAGE = DEFAULT_FAVICON_PNG;
