import type { ThemeConfig, ThemeSkin } from "@/types/theme";

/** 默认生活服务绿 — 全局默认皮肤 */
export const DEFAULT_SKIN_ID = "default_life_green";

export const DEFAULT_LIFE_GREEN_CONFIG: ThemeConfig = {
  skinName: "默认生活服务绿",
  bgColor: "#F5F7FA",
  surfaceColor: "#FFFFFF",
  primaryColor: "#00B14F",
  secondaryColor: "#E0F5E9",
  accentColor: "#FFC107",
  priceColor: "#FF5722",
  textColor: "#333333",
  mutedTextColor: "#888888",
  borderColor: "#E5E7EB",
  successColor: "#00A65A",
  warningColor: "#FF9800",
  dangerColor: "#F44336",
  radius: "12px",
  fontFamily: "system-ui, -apple-system, 'PingFang SC', sans-serif",
  shadowStyle: "soft",
  buttonStyle: "rounded",
  navStyle: "floating",
  badgeStyle: "soft",
  priceStyle: "bold",
  productCardVariant: "standard",
  cardStyle: "elevated",
  cardTextAlign: "left",
  imageRatio: "1 / 1",
  imageFit: "cover",
  homeLayout: "classic",
  headerStyle: "clean",
  bannerStyle: "fresh",
  couponStyle: "ticket",
  memberCardStyle: "light",
  categoryIconStyle: "soft",
  motionLevel: "soft",
  density: "comfortable",
  adminThemeMode: "follow_store",
};

/** @deprecated 使用 DEFAULT_LIFE_GREEN_CONFIG */
export const CLASSIC_GOLD_BLACK_CONFIG = DEFAULT_LIFE_GREEN_CONFIG;

/** 仅当数据库无皮肤 / 接口失败时的兜底（单套），不会批量恢复历史 6 套预设 */
export const FALLBACK_THEME_SKIN: ThemeSkin = {
  id: DEFAULT_SKIN_ID,
  name: "默认生活服务绿",
  sceneTag: "life_service",
  clientEnabled: true,
  config: DEFAULT_LIFE_GREEN_CONFIG,
};

/** @deprecated 请使用 FALLBACK_THEME_SKIN；保留数组形态以兼容旧引用 */
export const THEME_PRESETS: ThemeSkin[] = [FALLBACK_THEME_SKIN];

/** 促销红橙皮肤 ID：管理后台跟随时减轻红底（仅当仍使用该 ID 时生效） */
export const PROMO_SKIN_ID = "promo_red_orange";

/** 促销红橙在管理后台使用时减轻红底，避免运营视觉疲劳 */
export const PROMO_ADMIN_BG_OVERRIDES: Pick<ThemeConfig, "bgColor" | "surfaceColor" | "borderColor"> = {
  bgColor: "#F5F7FA",
  surfaceColor: "#FFFFFF",
  borderColor: "#E5E7EB",
};

/** 后台固定安全主题：不跟随促销/黑金等强视觉皮肤 */
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
