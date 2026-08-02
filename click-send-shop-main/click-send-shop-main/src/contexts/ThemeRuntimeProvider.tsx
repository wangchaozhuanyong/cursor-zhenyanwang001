import { createContext, useContext, useLayoutEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { DEFAULT_RUNTIME_THEME_SKIN } from "@/constants/themeRuntimeDefaults";
import {
  CURATED_LIFE_CONFIG,
  CURATED_LIFE_SKIN,
  CURATED_LIFE_SKIN_ID,
} from "@/constants/themePresets";
import { resolvePublicThemeFromSkin } from "@/lib/publicTheme";
import { getClientDesignStyleBySkinId } from "@/utils/clientDesignStyle";
import { buildStorefrontNextSkinTokens } from "@/utils/storefrontSkinTokens";
import { generateThemePalette } from "@/utils/themeContrast";
import type { ThemeConfig, ThemeSkin } from "@/types/theme";

type ThemeContextValue = {
  theme: "light";
  skinId: string;
  skins: ThemeSkin[];
  switchableSkins: ThemeSkin[];
  pickerSkins: ThemeSkin[];
  setSkinId: (id: string) => void;
  themeConfig: ThemeConfig;
  themeReady: boolean;
  themeSynced: boolean;
};

const ThemeRuntimeContext = createContext<ThemeContextValue | null>(null);
const FIXED_SKINS = [CURATED_LIFE_SKIN];
const EMPTY_SKINS: ThemeSkin[] = [];
const NOOP_SET_SKIN = () => {};

function normalizeThemeConfig(input: Partial<ThemeConfig> | null | undefined): ThemeConfig {
  const raw = input ?? {};
  return {
    ...DEFAULT_RUNTIME_THEME_SKIN.config,
    ...raw,
    texture: {
      ...DEFAULT_RUNTIME_THEME_SKIN.config.texture,
      ...(raw.texture ?? {}),
    },
    festival: {
      ...DEFAULT_RUNTIME_THEME_SKIN.config.festival,
      ...(raw.festival ?? {}),
    },
    adminThemeMode: "fixed",
  };
}

function applyThemeDataAttributes(root: HTMLElement, config: ThemeConfig, skin: ThemeSkin) {
  root.setAttribute("data-public-theme", resolvePublicThemeFromSkin(skin, config));
  root.setAttribute("data-admin-theme", config.adminThemeMode);
  root.setAttribute("data-theme-skin-id", skin.id);
  root.setAttribute("data-theme", skin.id);
  root.setAttribute("data-client-design-style", getClientDesignStyleBySkinId(skin.id));
  root.setAttribute("data-theme-category", skin.category);
  if (skin.sceneTag) root.setAttribute("data-theme-scene", skin.sceneTag);
  else root.removeAttribute("data-theme-scene");
  root.setAttribute("data-theme-button-style", config.buttonStyle);
  root.setAttribute("data-theme-nav-style", config.navStyle);
  root.setAttribute("data-theme-product-card-variant", config.productCardVariant);
  root.setAttribute("data-theme-card-style", config.cardStyle);
  root.setAttribute("data-theme-card-align", config.cardTextAlign);
  root.setAttribute("data-theme-image-fit", config.imageFit);
  root.setAttribute("data-theme-image-ratio", config.imageRatio);
  root.setAttribute("data-theme-badge-style", config.badgeStyle);
  root.setAttribute("data-theme-price-style", config.priceStyle);
  root.setAttribute("data-theme-shadow-style", config.shadowStyle);
  root.setAttribute("data-theme-home-layout", config.homeLayout);
  root.setAttribute("data-home-layout", config.homeLayout);
  root.setAttribute("data-theme-header-style", config.headerStyle);
  root.setAttribute("data-header-style", config.headerStyle);
  root.setAttribute("data-theme-banner-style", config.bannerStyle);
  root.setAttribute("data-banner-style", config.bannerStyle);
  root.setAttribute("data-theme-coupon-style", config.couponStyle);
  root.setAttribute("data-theme-member-card-style", config.memberCardStyle);
  root.setAttribute("data-theme-category-icon-style", config.categoryIconStyle);
  root.setAttribute("data-theme-motion-level", config.motionLevel);
  root.setAttribute("data-theme-density", config.density);
  root.setAttribute("data-theme-admin-mode", config.adminThemeMode);
  root.setAttribute("data-product-card", config.productCardVariant);
  root.setAttribute("data-card-style", config.cardStyle);
  root.setAttribute("data-texture", config.texture.material);
  root.setAttribute("data-density", config.density);
  root.setAttribute("data-motion", config.motionLevel);
  root.setAttribute("data-festival-mode", config.festival.mode);
}

function applyStorefrontTheme(root: HTMLElement, config: ThemeConfig, skin: ThemeSkin) {
  root.classList.remove("dark");
  root.setAttribute("data-theme-ready", "true");
  root.setAttribute("data-theme-synced", "true");
  applyThemeDataAttributes(root, config, skin);

  const palette = generateThemePalette(config);
  Object.entries(palette).forEach(([key, value]) => root.style.setProperty(key, value));
  Object.entries(buildStorefrontNextSkinTokens(config, palette)).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

function buildContextValue(config: ThemeConfig, skinId: string): ThemeContextValue {
  return {
    theme: "light",
    skinId,
    skins: FIXED_SKINS,
    switchableSkins: EMPTY_SKINS,
    pickerSkins: EMPTY_SKINS,
    setSkinId: NOOP_SET_SKIN,
    themeConfig: config,
    themeReady: true,
    themeSynced: true,
  };
}

export function ThemeRuntimeProvider({ children }: { children: ReactNode }) {
  const themeConfig = useMemo(() => normalizeThemeConfig(CURATED_LIFE_CONFIG), []);
  const value = useMemo(
    () => buildContextValue(themeConfig, CURATED_LIFE_SKIN_ID),
    [themeConfig],
  );

  useLayoutEffect(() => {
    applyStorefrontTheme(document.documentElement, themeConfig, CURATED_LIFE_SKIN);
  }, [themeConfig]);

  return <ThemeRuntimeContext.Provider value={value}>{children}</ThemeRuntimeContext.Provider>;
}

export function ThemeRuntimeOverrideProvider({
  config,
  children,
}: {
  config: ThemeConfig;
  children: ReactNode;
}) {
  const parent = useThemeRuntime();
  const previewConfig = useMemo(() => normalizeThemeConfig(config), [config]);
  const value = useMemo<ThemeContextValue>(
    () => ({
      ...parent,
      skinId: `preview-${parent.skinId}`,
      themeConfig: previewConfig,
    }),
    [parent, previewConfig],
  );

  return <ThemeRuntimeContext.Provider value={value}>{children}</ThemeRuntimeContext.Provider>;
}

export function useThemeRuntime() {
  const context = useContext(ThemeRuntimeContext);
  if (!context) throw new Error("useThemeRuntime must be used within ThemeRuntimeProvider");
  return context;
}
