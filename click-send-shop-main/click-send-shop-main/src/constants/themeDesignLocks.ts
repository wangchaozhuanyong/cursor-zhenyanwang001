import type { ThemeConfig } from "@/types/theme";

export const STOREFRONT_DESIGN_LOCKS = {
  radius: "14px",
  fontFamily: "system-ui, -apple-system, 'PingFang SC', sans-serif",
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

export function applyStorefrontDesignLocks(config: ThemeConfig): ThemeConfig {
  return { ...config, ...STOREFRONT_DESIGN_LOCKS };
}
