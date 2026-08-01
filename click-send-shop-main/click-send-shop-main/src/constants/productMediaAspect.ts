/**
 * 商品主图、详情图集和视频共用固定方形容器，切换媒体时保持页面稳定。
 */
export const THEME_PRODUCT_MEDIA_RATIO = "1 / 1" as const;

export const THEME_PRODUCT_MEDIA_ASPECT_STYLE = {
  aspectRatio: THEME_PRODUCT_MEDIA_RATIO,
} as const;
