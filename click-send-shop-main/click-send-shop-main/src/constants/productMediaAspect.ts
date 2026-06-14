/**
 * 商品主图 / 详情图集 / 详情视频容器统一使用主题里的「商品图比例」。
 * 由 ThemeRuntimeProvider 写入 document 的 --theme-image-ratio（与 AdminThemeSettings 一致）。
 * 图与视频共用同一外层比例，切换媒体时高度不变；视频内用 object-contain，画幅与主题比例一致时黑边最少。
 */
export const THEME_PRODUCT_MEDIA_RATIO = "var(--theme-image-ratio, 1 / 1)" as const;

export const THEME_PRODUCT_MEDIA_ASPECT_STYLE = {
  aspectRatio: THEME_PRODUCT_MEDIA_RATIO,
} as const;
