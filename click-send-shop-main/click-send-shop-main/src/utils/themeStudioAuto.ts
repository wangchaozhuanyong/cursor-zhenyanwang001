import type { ThemeConfig } from "@/types/theme";
import {
  adjustColor,
  getContrastRatio,
  getMutedTextColor,
  getReadableTextColor,
  isDarkColor,
  mixColors,
  parseColor,
  rgbToCss,
} from "@/utils/themeContrast";
import { normalizeThemeConfig } from "@/utils/themeConfig";

function mixHex(a: string, b: string, weight: number) {
  return rgbToCss(mixColors(parseColor(a), parseColor(b), weight));
}

export function autoSecondaryColor(config: ThemeConfig): string {
  const dark = isDarkColor(config.bgColor);
  return mixHex(config.primaryColor, config.bgColor, dark ? 0.72 : 0.88);
}

export function autoAccentColor(config: ThemeConfig): string {
  const primary = parseColor(config.primaryColor);
  const hueShift = mixColors(primary, parseColor(config.secondaryColor || config.primaryColor), 0.35);
  return rgbToCss(hueShift);
}

export function autoBorderColor(config: ThemeConfig): string {
  const dark = isDarkColor(config.bgColor);
  return mixHex(config.bgColor, dark ? "#FFFFFF" : "#000000", dark ? 0.18 : 0.12);
}

export function autoOptimizeTextColors(config: ThemeConfig): Pick<ThemeConfig, "textColor" | "mutedTextColor"> {
  const textColor = getReadableTextColor(config.bgColor, config.textColor);
  const mutedTextColor = getMutedTextColor(config.bgColor, textColor);
  return { textColor, mutedTextColor };
}

export function autoForegroundFromPalette(config: ThemeConfig): ThemeConfig {
  const next = { ...config };
  const primaryFg = getReadableTextColor(config.primaryColor);
  const dangerFg = getReadableTextColor(config.dangerColor);
  if (getContrastRatio(config.primaryColor, primaryFg) < 4.5) {
    next.textColor = autoOptimizeTextColors(config).textColor;
  }
  if (getContrastRatio(config.dangerColor, dangerFg) < 4.5) {
    next.dangerColor = adjustColor(config.dangerColor, isDarkColor(config.dangerColor) ? 24 : -24);
  }
  return normalizeThemeConfig(next);
}

export type AutoColorAction =
  | "secondary"
  | "accent"
  | "border"
  | "textContrast"
  | "foreground";

export function applyAutoColorAction(config: ThemeConfig, action: AutoColorAction): ThemeConfig {
  const patch: Partial<ThemeConfig> = {};
  switch (action) {
    case "secondary":
      patch.secondaryColor = autoSecondaryColor(config);
      break;
    case "accent":
      patch.accentColor = autoAccentColor(config);
      break;
    case "border":
      patch.borderColor = autoBorderColor(config);
      break;
    case "textContrast":
      Object.assign(patch, autoOptimizeTextColors(config));
      break;
    case "foreground":
      return autoForegroundFromPalette(config);
    default:
      break;
  }
  return normalizeThemeConfig({ ...config, ...patch });
}

export function resetThemeGroup(config: ThemeConfig, group: string, preset?: ThemeConfig): ThemeConfig {
  const base = preset || config;
  const groups: Record<string, Array<keyof ThemeConfig>> = {
    basic: ["skinName"],
    colors: [
      "bgColor",
      "surfaceColor",
      "primaryColor",
      "secondaryColor",
      "accentColor",
      "priceColor",
    ],
    text: ["textColor", "mutedTextColor", "borderColor"],
    status: ["successColor", "warningColor", "dangerColor"],
    buttons: ["buttonStyle", "navStyle", "radius", "shadowStyle", "motionLevel", "density"],
    card: [
      "productCardVariant",
      "cardStyle",
      "cardTextAlign",
      "imageRatio",
      "imageFit",
      "priceStyle",
    ],
    marketing: [
      "homeLayout",
      "headerStyle",
      "bannerStyle",
      "couponStyle",
      "memberCardStyle",
      "categoryIconStyle",
      "badgeStyle",
    ],
    advanced: ["adminThemeMode", "fontFamily"],
  };
  const keys = groups[group];
  if (!keys) return config;
  const patch: Partial<ThemeConfig> = {};
  for (const key of keys) {
    (patch as Record<string, unknown>)[key] = base[key];
  }
  return normalizeThemeConfig({ ...config, ...patch });
}
