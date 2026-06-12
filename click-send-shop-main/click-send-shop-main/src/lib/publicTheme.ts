import type { ThemeConfig, ThemeSkin } from "@/types/theme";

export const PUBLIC_THEME_STORAGE_KEY = "flashcast:public-theme";

export const PUBLIC_THEMES = [
  "classic-luxury",
  "modern-light",
  "dark-premium",
  "warm-home",
  "brand-red",
] as const;

export type PublicTheme = (typeof PUBLIC_THEMES)[number];

export const DEFAULT_PUBLIC_THEME: PublicTheme = "classic-luxury";

const SKIN_PUBLIC_THEME_MAP: Record<string, PublicTheme> = {
  premium_champagne_ivory: "classic-luxury",
  premium_pearl_blush: "warm-home",
  premium_porcelain_jade: "classic-luxury",
  premium_sky_silk: "modern-light",
  premium_apricot_sand: "warm-home",
  festival_spring_ruby_gold: "brand-red",
  festival_moon_orange_gold: "brand-red",
};

function parseHexColor(value?: string | null) {
  const raw = (value || "").replace("#", "").trim();
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return raw.split("").map((char) => Number.parseInt(`${char}${char}`, 16));
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) {
    return [raw.slice(0, 2), raw.slice(2, 4), raw.slice(4, 6)].map((part) => Number.parseInt(part, 16));
  }
  return null;
}

function isDarkColor(value?: string | null) {
  const rgb = parseHexColor(value);
  if (!rgb) return false;
  const [r, g, b] = rgb.map((channel) => channel / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.34;
}

function isRedFamily(value?: string | null) {
  const rgb = parseHexColor(value);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  return r > 150 && g < 120 && b < 120;
}

export function isPublicTheme(value: unknown): value is PublicTheme {
  return typeof value === "string" && PUBLIC_THEMES.includes(value as PublicTheme);
}

export function resolvePublicTheme(value: unknown): PublicTheme {
  return isPublicTheme(value) ? value : DEFAULT_PUBLIC_THEME;
}

export function resolvePublicThemeFromSkin(skin?: ThemeSkin | null, config?: ThemeConfig | null): PublicTheme {
  if (skin?.id && SKIN_PUBLIC_THEME_MAP[skin.id]) {
    return SKIN_PUBLIC_THEME_MAP[skin.id];
  }
  if (skin?.sceneTag === "holiday" || isRedFamily(config?.primaryColor) || isRedFamily(config?.priceColor)) {
    return "brand-red";
  }
  if (isDarkColor(config?.bgColor) || isDarkColor(config?.surfaceColor)) {
    return "dark-premium";
  }
  return DEFAULT_PUBLIC_THEME;
}

export function applyPublicTheme(theme: PublicTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-public-theme", theme);
}

export function readStoredPublicTheme(): PublicTheme {
  if (typeof window === "undefined") return DEFAULT_PUBLIC_THEME;
  try {
    return resolvePublicTheme(window.localStorage.getItem(PUBLIC_THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_PUBLIC_THEME;
  }
}

export function storePublicTheme(theme: PublicTheme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PUBLIC_THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage 在隐私模式不可用时，直接降级到运行时主题。
  }
}
