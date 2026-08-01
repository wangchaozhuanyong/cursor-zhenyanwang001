import {
  BANNER_ASPECT_RATIO,
  BANNER_ASPECT_TOLERANCE,
  BANNER_IMAGE_HEIGHT,
  BANNER_IMAGE_WIDTH,
  DESKTOP_BANNER_ASPECT_RATIO,
} from "@/constants/bannerAspect";
import { isAspectRatioWithinTolerance } from "@/utils/imageRatio";

export type BannerImageTarget = "image_mobile" | "image_desktop" | "category_banner";

export type BannerImageDimensionAssessment = {
  level: "ok" | "warning" | "error";
  code: "ok" | "ratio_mismatch" | "resolution_low";
  message: string;
};

const TARGET_CONFIG = {
  image_mobile: {
    label: "移动端",
    ratio: BANNER_ASPECT_RATIO,
    ratioLabel: `${BANNER_ASPECT_RATIO.toFixed(2)}:1`,
    recommendedWidth: BANNER_IMAGE_WIDTH,
    recommendedHeight: BANNER_IMAGE_HEIGHT,
  },
  image_desktop: {
    label: "桌面端",
    ratio: DESKTOP_BANNER_ASPECT_RATIO,
    ratioLabel: `${DESKTOP_BANNER_ASPECT_RATIO.toFixed(2)}:1`,
    recommendedWidth: 1600,
    recommendedHeight: 600,
  },
  category_banner: {
    label: "分类主图",
    ratio: 16 / 7,
    ratioLabel: "16:7",
    recommendedWidth: 1200,
    recommendedHeight: 525,
  },
} as const;

export function assessBannerImageDimensions(
  size: { width: number; height: number },
  target: BannerImageTarget,
  strictRatioCheck: boolean,
): BannerImageDimensionAssessment {
  const config = TARGET_CONFIG[target];
  const actualSize = `${size.width}×${size.height}`;
  if (!isAspectRatioWithinTolerance(
    size.width,
    size.height,
    config.ratio,
    BANNER_ASPECT_TOLERANCE,
  )) {
    return {
      level: strictRatioCheck ? "error" : "warning",
      code: "ratio_mismatch",
      message: `当前${config.label}图片为 ${actualSize}，不符合 ${config.ratioLabel} 比例${strictRatioCheck ? "，已阻止上传" : ""}。`,
    };
  }

  if (size.width < config.recommendedWidth || size.height < config.recommendedHeight) {
    return {
      level: "warning",
      code: "resolution_low",
      message: `当前${config.label}图片为 ${actualSize}，建议至少使用 ${config.recommendedWidth}×${config.recommendedHeight}，避免高清屏显示模糊。`,
    };
  }

  return {
    level: "ok",
    code: "ok",
    message: `${config.label}图片尺寸符合要求。`,
  };
}
