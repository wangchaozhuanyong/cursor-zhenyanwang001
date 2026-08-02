import { STOREFRONT_THEME_DEFAULTS } from "@/constants/themeDesignLocks";
import type { ThemeConfig, ThemeSkin } from "@/types/theme";

export const DEFAULT_SKIN_ID = "polar";

export const DEFAULT_RUNTIME_THEME_CONFIG: ThemeConfig = {
  skinName: "银翼极昼·旗舰科技",
  bgColor: "#ECF3F7",
  surfaceColor: "#FBFDFF",
  primaryColor: "#183B5B",
  secondaryColor: "#DDEAF1",
  accentColor: "#7895A8",
  priceColor: "#CC4A35",
  borderColor: "#D2E0E8",
  textColor: "#16232E",
  mutedTextColor: "#61717D",
  successColor: "#2F745B",
  warningColor: "#A66F22",
  dangerColor: "#BC343B",
  ...STOREFRONT_THEME_DEFAULTS,
  radius: "18px",
  density: "compact",
  motionLevel: "soft",
  shadowStyle: "aerial",
  buttonStyle: "capsule",
  navStyle: "glassLine",
  badgeStyle: "technical",
  priceStyle: "tabularBold",
  productCardVariant: "spec",
  cardStyle: "glassBordered",
  cardTextAlign: "left",
  imageRatio: "4 / 3",
  imageFit: "contain",
  homeLayout: "modularShowcase",
  headerStyle: "floatingGlass",
  bannerStyle: "panoramicLight",
  couponStyle: "precisionVoucher",
  memberCardStyle: "titaniumBlue",
  categoryIconStyle: "monoGlyph",
  adminThemeMode: "fixed",
  texture: {
    material: "titaniumMist",
    intensity: "subtle",
    surface: "satinGlass",
    grain: "microEtchedNoise",
    grainOpacity: 0.018,
    highlight: "edgeSheen",
    highlightOpacity: 0.1,
    metal: "brushedTitanium",
    pattern: "technicalGrid",
    patternOpacity: 0.055,
    line: "coolHairlineInnerHighlight",
    shadow: "wideBlueAmbientShortContact",
    temperature: "coolNeutral",
    imageContrast: 0.94,
    imageSaturation: 0.88,
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
};

export const DEFAULT_RUNTIME_THEME_SKIN: ThemeSkin = {
  id: DEFAULT_SKIN_ID,
  themeKey: DEFAULT_SKIN_ID,
  name: "银翼极昼",
  description: "默认商城运行时皮肤。",
  category: "日常商城",
  sceneTag: "mall",
  type: "evergreen",
  status: "published",
  isDefault: true,
  config: DEFAULT_RUNTIME_THEME_CONFIG,
};

export const ADMIN_SAFE_THEME_OVERRIDES: Pick<
  ThemeConfig,
  | "bgColor"
  | "surfaceColor"
  | "borderColor"
  | "textColor"
  | "mutedTextColor"
  | "primaryColor"
  | "secondaryColor"
  | "accentColor"
  | "priceColor"
> = {
  bgColor: "#F5F7FA",
  surfaceColor: "#FFFFFF",
  borderColor: "#E5E7EB",
  textColor: "#333333",
  mutedTextColor: "#888888",
  primaryColor: "#00B14F",
  secondaryColor: "#E0F5E9",
  accentColor: "#FFC107",
  priceColor: "#FF5722",
};
