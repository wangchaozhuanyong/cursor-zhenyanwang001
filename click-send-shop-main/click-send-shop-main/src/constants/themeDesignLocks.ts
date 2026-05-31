import type { ThemeConfig } from "@/types/theme";

export const STOREFRONT_DESIGN_LOCKS = {
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
