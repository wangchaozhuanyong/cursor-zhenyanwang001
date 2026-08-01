import {
  FIXED_STOREFRONT_DESIGN_ID,
  FIXED_STOREFRONT_THEME_CONFIG,
} from "@/constants/fixedStorefrontDesign";

export function useFixedStorefrontDesign() {
  return {
    designId: FIXED_STOREFRONT_DESIGN_ID,
    skinId: FIXED_STOREFRONT_DESIGN_ID,
    themeConfig: FIXED_STOREFRONT_THEME_CONFIG,
  } as const;
}
