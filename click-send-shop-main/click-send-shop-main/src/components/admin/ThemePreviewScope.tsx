import { useMemo } from "react";
import type { ReactNode } from "react";
import { ThemeRuntimeOverrideProvider } from "@/contexts/ThemeRuntimeProvider";
import type { ThemeConfig } from "@/types/theme";
import { generateThemePalette } from "@/utils/themeContrast";

function toDataAttrs(config: ThemeConfig) {
  return {
    "data-theme-button-style": config.buttonStyle,
    "data-theme-nav-style": config.navStyle,
    "data-theme-product-card-variant": config.productCardVariant,
    "data-theme-badge-style": config.badgeStyle,
    "data-theme-price-style": config.priceStyle,
    "data-theme-home-layout": config.homeLayout,
    "data-theme-header-style": config.headerStyle,
    "data-theme-banner-style": config.bannerStyle,
    "data-theme-coupon-style": config.couponStyle,
    "data-theme-member-card-style": config.memberCardStyle,
    "data-theme-category-icon-style": config.categoryIconStyle,
    "data-theme-motion-level": config.motionLevel,
    "data-theme-density": config.density,
    "data-theme-admin-mode": config.adminThemeMode,
  };
}

export default function ThemePreviewScope({
  config,
  children,
  className,
  style: styleOverride,
}: {
  config: ThemeConfig;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const style = useMemo(
    () => ({ ...generateThemePalette(config), ...(styleOverride || {}) }),
    [config, styleOverride],
  );
  const dataAttrs = toDataAttrs(config);
  return (
    <ThemeRuntimeOverrideProvider config={config}>
      <div className={className} style={style} {...dataAttrs}>
        {children}
      </div>
    </ThemeRuntimeOverrideProvider>
  );
}
