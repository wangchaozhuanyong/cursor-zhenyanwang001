import type { ThemeConfig, ThemeSkin } from "@/types/theme";

export const PUBLIC_THEME_STORAGE_KEY = "flashcast:public-theme";

export const PUBLIC_THEMES = [
  "ivory-gold",
  "pearl-slate",
  "linen-walnut",
  "sage-stone",
  "ruby-cream",
] as const;

export type PublicTheme = (typeof PUBLIC_THEMES)[number];

export const DEFAULT_PUBLIC_THEME: PublicTheme = "ivory-gold";

export const PUBLIC_THEME_LABELS: Record<PublicTheme, string> = {
  "ivory-gold": "象牙白金",
  "pearl-slate": "珍珠蓝灰",
  "linen-walnut": "亚麻胡桃",
  "sage-stone": "鼠尾草石",
  "ruby-cream": "赤金奶油",
};

export const PUBLIC_THEME_DESCRIPTIONS: Record<PublicTheme, string> = {
  "ivory-gold": "默认推荐，适合装修官网和材料商城，干净、高级、温暖。",
  "pearl-slate": "现代专业风，适合办公室、商业空间、工程装修。",
  "linen-walnut": "温馨家装风，适合家庭装修、软装、木质空间。",
  "sage-stone": "自然环保风，适合环保材料、原木风、侘寂风空间。",
  "ruby-cream": "商品转化风，适合材料商城、购买页、优惠活动。",
};

const SKIN_PUBLIC_THEME_MAP: Record<string, PublicTheme> = {
  premium_champagne_ivory: "ivory-gold",
  premium_sky_silk: "pearl-slate",
  premium_apricot_sand: "linen-walnut",
  premium_porcelain_jade: "sage-stone",
  premium_pearl_blush: "ruby-cream",
  festival_spring_ruby_gold: "ruby-cream",
  festival_moon_orange_gold: "linen-walnut",
};

const LEGACY_PUBLIC_THEME_MAP: Record<string, PublicTheme> = {
  "classic-luxury": "ivory-gold",
  "modern-light": "pearl-slate",
  "warm-home": "linen-walnut",
  "brand-red": "ruby-cream",
  "obsidian-gold": "ivory-gold",
  "dark-premium": "ivory-gold",
  "black-gold": "ivory-gold",
  "luxury-dark": "ivory-gold",
};

export function isPublicTheme(value: unknown): value is PublicTheme {
  return typeof value === "string" && PUBLIC_THEMES.includes(value as PublicTheme);
}

export function resolvePublicTheme(value: unknown): PublicTheme {
  if (isPublicTheme(value)) return value;
  if (typeof value === "string" && LEGACY_PUBLIC_THEME_MAP[value]) {
    return LEGACY_PUBLIC_THEME_MAP[value];
  }
  return DEFAULT_PUBLIC_THEME;
}

export function resolvePublicThemeFromSkin(skin?: ThemeSkin | null, config?: ThemeConfig | null): PublicTheme {
  if (skin?.id && SKIN_PUBLIC_THEME_MAP[skin.id]) {
    return SKIN_PUBLIC_THEME_MAP[skin.id];
  }
  const legacyName = config?.skinName;
  if (legacyName) return resolvePublicTheme(legacyName);
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
