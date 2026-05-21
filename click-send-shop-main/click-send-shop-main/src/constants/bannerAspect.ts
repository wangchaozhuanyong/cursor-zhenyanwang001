/** 首页 / 登录页轮播标准比例（宽:高 = 2.34:1） */
export const BANNER_ASPECT_RATIO = 117 / 50;

/** 用于 CSS `aspect-ratio` */
export const BANNER_ASPECT_CSS = "117 / 50";

/** 上传比例容差（±3%），兼容 750×330、1200×512 等常见横幅 */
export const BANNER_ASPECT_TOLERANCE = 0.03;

/** Tailwind `aspect-[…]` 简写 */
export const BANNER_ASPECT_CLASS = "aspect-[117/50]";

export const BANNER_SIZE_PRESET_LIST = [
  "1200×512",
  "1170×500",
  "1600×684",
  "750×320",
] as const;

export const BANNER_SIZE_PRESETS = BANNER_SIZE_PRESET_LIST.join(" / ");

/** 轮播图 `img` 默认宽高（利于 CLS，与 2.34:1 一致） */
export const BANNER_IMAGE_WIDTH = 1200;
export const BANNER_IMAGE_HEIGHT = Math.round(BANNER_IMAGE_WIDTH / BANNER_ASPECT_RATIO);

/** 首页骨架屏 Banner 高度（与轮播容器同比例） */
export const BANNER_SKELETON_HEIGHT_CLASS = "h-[calc((100vw-2rem)*50/117)] max-h-52 min-h-32";
