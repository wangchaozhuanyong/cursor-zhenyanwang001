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

export const STOREFRONT_DESIGN_LOCKS = {
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
>;

export const LOCKED_STOREFRONT_THEME_FIELDS = [
  { key: "buttonStyle", label: "按钮", lockedValue: STOREFRONT_DESIGN_LOCKS.buttonStyle, reason: "成交动作统一" },
  { key: "navStyle", label: "底部导航", lockedValue: STOREFRONT_DESIGN_LOCKS.navStyle, reason: "移动端路径统一" },
  { key: "productCardVariant", label: "商品卡", lockedValue: STOREFRONT_DESIGN_LOCKS.productCardVariant, reason: "商品陈列统一" },
  { key: "couponStyle", label: "优惠券", lockedValue: STOREFRONT_DESIGN_LOCKS.couponStyle, reason: "营销质感统一" },
  { key: "homeLayout", label: "首页布局", lockedValue: STOREFRONT_DESIGN_LOCKS.homeLayout, reason: "首页骨架统一" },
  { key: "headerStyle", label: "头部", lockedValue: STOREFRONT_DESIGN_LOCKS.headerStyle, reason: "品牌入口统一" },
  { key: "memberCardStyle", label: "会员卡", lockedValue: STOREFRONT_DESIGN_LOCKS.memberCardStyle, reason: "会员权益统一" },
  { key: "density", label: "页面密度", lockedValue: STOREFRONT_DESIGN_LOCKS.density, reason: "阅读节奏统一" },
] as const satisfies ReadonlyArray<{
  key: keyof typeof STOREFRONT_DESIGN_LOCKS;
  label: string;
  lockedValue: string;
  reason: string;
}>;

export function applyStorefrontDesignLocks(config: ThemeConfig): ThemeConfig {
  return { ...config, ...STOREFRONT_DESIGN_LOCKS };
}
