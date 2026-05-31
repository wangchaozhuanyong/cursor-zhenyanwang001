import type { ThemeConfig, ThemeHolidayRule, ThemeSkin } from "@/types/theme";
import { STOREFRONT_DESIGN_LOCKS } from "@/constants/themeDesignLocks";

export const DEFAULT_SKIN_ID = "default_life_green";
export const FESTIVAL_SKIN_ID = "festive_ruby_gold";

export const DEFAULT_LIFE_GREEN_CONFIG: ThemeConfig = {
  skinName: "日常购物皮肤",
  bgColor: "#F4F7F2",
  surfaceColor: "#FFFFFF",
  primaryColor: "#0F8F54",
  secondaryColor: "#E4F2EA",
  accentColor: "#B89755",
  priceColor: "#D94A2B",
  textColor: "#17211B",
  mutedTextColor: "#6F7A72",
  borderColor: "#DFE7DF",
  successColor: "#16865A",
  warningColor: "#C8892F",
  dangerColor: "#C94940",
  ...STOREFRONT_DESIGN_LOCKS,
};

export const FESTIVAL_RUBY_GOLD_CONFIG: ThemeConfig = {
  skinName: "节日促销皮肤",
  bgColor: "#FFF8F3",
  surfaceColor: "#FFFFFF",
  primaryColor: "#B91C2B",
  secondaryColor: "#FBE7E2",
  accentColor: "#C79A3B",
  priceColor: "#D62828",
  textColor: "#2D1D1B",
  mutedTextColor: "#806C68",
  borderColor: "#F1DCD3",
  successColor: "#1E7A52",
  warningColor: "#D49B2A",
  dangerColor: "#B91C2B",
  ...STOREFRONT_DESIGN_LOCKS,
};

export const DAILY_COMMERCE_SKIN: ThemeSkin = {
  id: DEFAULT_SKIN_ID,
  name: "日常购物皮肤",
  description: "适合全年默认使用，白底、绿色品牌感、橙红价格强调，整体干净耐看。",
  sceneTag: "mall",
  clientEnabled: true,
  config: DEFAULT_LIFE_GREEN_CONFIG,
};

export const FESTIVAL_RUBY_GOLD_SKIN: ThemeSkin = {
  id: FESTIVAL_SKIN_ID,
  name: "节日促销皮肤",
  description: "适合节日和大促自动启用，暖白底配红金点缀，有氛围但不刺眼。",
  sceneTag: "holiday",
  clientEnabled: true,
  config: FESTIVAL_RUBY_GOLD_CONFIG,
};

export const FALLBACK_THEME_SKIN = DAILY_COMMERCE_SKIN;
export const THEME_PRESETS: ThemeSkin[] = [DAILY_COMMERCE_SKIN, FESTIVAL_RUBY_GOLD_SKIN];

export const DEFAULT_HOLIDAY_SKIN_ID = FESTIVAL_SKIN_ID;

export const DEFAULT_THEME_HOLIDAY_RULES: ThemeHolidayRule[] = [
  { id: "new_year", name: "元旦 / 新年", enabled: true, start: "01-01", end: "01-03", skinId: FESTIVAL_SKIN_ID },
  { id: "cny", name: "春节档", enabled: false, start: "02-01", end: "02-17", skinId: FESTIVAL_SKIN_ID },
  { id: "hari_raya", name: "开斋节档", enabled: false, start: "03-18", end: "03-25", skinId: FESTIVAL_SKIN_ID },
  { id: "merdeka", name: "马来西亚国庆", enabled: true, start: "08-29", end: "09-01", skinId: FESTIVAL_SKIN_ID },
  { id: "double_11", name: "双11大促", enabled: true, start: "11-01", end: "11-12", skinId: FESTIVAL_SKIN_ID },
  { id: "double_12", name: "双12年终促销", enabled: true, start: "12-01", end: "12-13", skinId: FESTIVAL_SKIN_ID },
  { id: "christmas", name: "圣诞 / 年末", enabled: true, start: "12-20", end: "12-27", skinId: FESTIVAL_SKIN_ID },
];

/** @deprecated Use DEFAULT_LIFE_GREEN_CONFIG. */
export const CLASSIC_GOLD_BLACK_CONFIG = DEFAULT_LIFE_GREEN_CONFIG;

/** @deprecated Kept only for old callers. */
export const PROMO_SKIN_ID = FESTIVAL_SKIN_ID;

export const PROMO_ADMIN_BG_OVERRIDES: Pick<ThemeConfig, "bgColor" | "surfaceColor" | "borderColor"> = {
  bgColor: "#F5F7FA",
  surfaceColor: "#FFFFFF",
  borderColor: "#E5E7EB",
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
