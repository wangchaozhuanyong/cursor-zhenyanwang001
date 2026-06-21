import type { ThemeConfig } from "@/types/theme";

export const EDITABLE_THEME_COLOR_FIELDS = [
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "priceColor",
  "bgColor",
  "surfaceColor",
  "borderColor",
  "textColor",
  "mutedTextColor",
  "successColor",
  "warningColor",
  "dangerColor",
] as const satisfies ReadonlyArray<keyof ThemeConfig>;

export const STOREFRONT_THEME_DEFAULTS = {
  radius: "14px",
  fontFamily:
    "system-ui, -apple-system, BlinkMacSystemFont, 'HarmonyOS Sans SC', 'PingFang SC', 'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif",
  shadowStyle: "soft",
  buttonStyle: "pill",
  navStyle: "glass",
  badgeStyle: "soft",
  priceStyle: "luxury",
  productCardVariant: "premium",
  cardStyle: "elevated",
  cardTextAlign: "left",
  imageRatio: "1 / 1",
  imageFit: "cover",
  homeLayout: "classic",
  headerStyle: "clean",
  bannerStyle: "fresh",
  couponStyle: "premium",
  memberCardStyle: "light",
  categoryIconStyle: "soft",
  motionLevel: "rich",
  density: "comfortable",
  adminThemeMode: "fixed",
  texture: {
    material: "quietPaper",
    intensity: "subtle",
    surface: "matte",
    grain: "fineNoise",
    grainOpacity: 0.012,
    highlight: "softEdge",
    highlightOpacity: 0.04,
    metal: "none",
    pattern: "none",
    patternOpacity: 0,
    line: "neutralHairline",
    shadow: "softContact",
    temperature: "neutral",
    imageContrast: 0.9,
    imageSaturation: 0.86,
  },
  festival: {
    mode: "none",
    activation: "manual",
    dateMode: "solar",
    leadDays: 0,
    tailDays: 0,
    decorativeDensity: "quiet",
    showCountdown: false,
    fallbackSkinId: null,
  },
} satisfies Pick<
  ThemeConfig,
  | "radius"
  | "fontFamily"
  | "shadowStyle"
  | "buttonStyle"
  | "navStyle"
  | "badgeStyle"
  | "priceStyle"
  | "productCardVariant"
  | "cardStyle"
  | "cardTextAlign"
  | "imageRatio"
  | "imageFit"
  | "homeLayout"
  | "headerStyle"
  | "bannerStyle"
  | "couponStyle"
  | "memberCardStyle"
  | "categoryIconStyle"
  | "motionLevel"
  | "density"
  | "adminThemeMode"
  | "texture"
  | "festival"
>;

export function applyStorefrontDesignDefaults(config: Partial<ThemeConfig>): ThemeConfig {
  return { ...STOREFRONT_THEME_DEFAULTS, ...config } as ThemeConfig;
}
