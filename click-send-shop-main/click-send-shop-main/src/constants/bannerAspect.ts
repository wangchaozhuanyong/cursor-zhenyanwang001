/** 移动端首页轮播标准比例（390×212） */
export const BANNER_ASPECT_RATIO = 390 / 212;

/** 用于 CSS `aspect-ratio` */
export const BANNER_ASPECT_CSS = "var(--store-banner-aspect, 390 / 212)";

/** 上传比例容差（±3%），兼容 750×330、1200×512 等常见横幅 */
export const BANNER_ASPECT_TOLERANCE = 0.03;

/** Tailwind `aspect-[…]` 简写 */
export const BANNER_ASPECT_CLASS = "aspect-[390/212]";

export const BANNER_SIZE_PRESET_LIST = [
  "1472×800",
  "1170×636",
  "780×424",
] as const;

export const BANNER_SIZE_PRESETS = BANNER_SIZE_PRESET_LIST.join(" / ");

/** 轮播图 `img` 默认宽高（利于 CLS，与 2.34:1 一致） */
export const BANNER_IMAGE_WIDTH = 1472;
export const BANNER_IMAGE_HEIGHT = Math.round(BANNER_IMAGE_WIDTH / BANNER_ASPECT_RATIO);

/** 首页骨架屏 Banner 高度（与轮播容器同比例） */
export const BANNER_SKELETON_HEIGHT_CLASS = "h-[calc((100vw-2rem)*212/390)] max-h-64 min-h-40";

export const DESKTOP_BANNER_ASPECT_RATIO = 8 / 3;
export const DESKTOP_BANNER_ASPECT_CLASS = "aspect-[8/3]";
export const DESKTOP_BANNER_SIZE_PRESETS = "1600×600 / 1440×540 / 1200×450";
