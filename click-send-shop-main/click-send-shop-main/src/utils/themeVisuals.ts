import type { ThemeConfig } from "@/types/theme";

/**
 * 浅色卡片/菜单上的描边图标色。勿用 --theme-secondary（皮肤里多为浅色「标签底」）。
 */
export const THEME_ACCENT_ICON_CLASS = "text-[var(--theme-primary)]";

/** 圆角图标底 + 描边色（个人中心订单/服务等） */
export const THEME_ACCENT_ICON_SHELL_CLASS =
  "bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]";

/** 浅色表面上的小标签（如地址「默认」） */
export const THEME_ACCENT_CHIP_CLASS =
  "rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_14%,var(--theme-surface))] px-2 py-0.5 text-[10px] font-semibold text-[var(--theme-primary)]";

/** 优惠券等浅色渐变底上的行内图标 */
export const THEME_COUPON_ICON_ON_LIGHT_CLASS =
  "text-[color-mix(in_srgb,var(--theme-secondary)_75%,#1a1612)]";

/** 深色/渐变券面上的行内图标 */
export const THEME_COUPON_ICON_ON_SURFACE_CLASS =
  "text-[color-mix(in_srgb,var(--theme-primary)_80%,var(--theme-text-on-surface))]";

/**
 * 优惠券/积分/返现等页顶部强调卡片。
 * 背景/文字由 ThemeRuntimeProvider → generateThemePalette 写入的
 * --theme-coupon-accent-*（按渐变中位色算对比度），换肤自动适配。
 */
export const THEME_ACCENT_HERO_SHELL = "theme-accent-hero bg-theme-coupon-accent";

/** 品牌主渐变 Hero（与后台「主色+辅色」渐变一致） */
export const THEME_GRADIENT_HERO_SHELL = "theme-accent-hero bg-theme-gradient";
export const THEME_ACCENT_HERO_LABEL =
  "theme-hero-accent-label text-xs font-medium uppercase tracking-wider";
export const THEME_ACCENT_HERO_VALUE = "theme-hero-accent-value font-bold";
export const THEME_ACCENT_HERO_MUTED = "theme-hero-accent-muted";
export const THEME_ACCENT_HERO_SUBTLE = "theme-hero-accent-subtle";
export const THEME_ACCENT_HERO_ICON_WRAP =
  "theme-hero-accent-icon-wrap flex items-center justify-center rounded-2xl backdrop-blur-sm";
export const THEME_ACCENT_HERO_ICON = "theme-hero-accent-icon";

export function getMemberCardClassName(style: ThemeConfig["memberCardStyle"]): string {
  switch (style) {
    case "blackGold":
      return "bg-[linear-gradient(110deg,#0d0b08,#1e1812_45%,#2b2016)] text-[#f7e6be]";
    case "gold":
      return "bg-[linear-gradient(110deg,#f4e7c8,#dec08b)] text-[#2f2415]";
    case "fresh":
      return "bg-[linear-gradient(110deg,#edf9f4,#d8efe4)] text-[#173429]";
    case "light":
    default:
      return "bg-[linear-gradient(110deg,#191714,#2a241d)] text-[#f2deab]";
  }
}

export function getCategoryIconShellClassName(style: ThemeConfig["categoryIconStyle"]): string {
  const base = "flex h-10 w-10 items-center justify-center text-xs font-semibold";
  switch (style) {
    case "circle":
      return `${base} rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]`;
    case "soft":
      return `${base} rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_14%,var(--theme-surface))] text-[var(--theme-primary)]`;
    case "solid":
      return `${base} rounded-xl bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]`;
    case "outline":
      return `${base} rounded-full border border-[var(--theme-primary)] bg-transparent text-[var(--theme-primary)]`;
    default:
      return `${base} rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]`;
  }
}

export function getBottomNavShellClassName(
  navStyle: ThemeConfig["navStyle"],
  placement: "fixed" | "sticky" | "absolute",
): string {
  const position = placement;
  const base = `${position} bottom-0 left-0 right-0 z-bottom-nav pointer-events-auto`;
  switch (navStyle) {
    case "floating":
      return `${base} border-0 bg-transparent px-3 pb-2 pt-1 shadow-none`;
    case "glass":
      return `${base} border-t border-[color-mix(in_srgb,var(--theme-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--theme-surface)_78%,transparent)] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-md`;
    case "clean":
    default:
      return `${base} border-t border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[0_-8px_24px_rgba(0,0,0,0.08)]`;
  }
}

export function getBottomNavInnerClassName(navStyle: ThemeConfig["navStyle"]): string {
  if (navStyle === "floating") {
    return "mx-auto max-w-lg overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[0_8px_32px_rgba(0,0,0,0.14)]";
  }
  return "mx-auto max-w-lg";
}

export function getBannerContainerClassName(bannerStyle: ThemeConfig["bannerStyle"]): string {
  switch (bannerStyle) {
    case "premium":
      return "rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)]";
    case "deal":
      return "rounded-xl ring-2 ring-[color-mix(in_srgb,var(--theme-price)_55%,transparent)]";
    case "dark":
      return "rounded-xl shadow-inner";
    case "fresh":
      return "rounded-2xl border border-[color-mix(in_srgb,var(--theme-primary)_25%,var(--theme-border))] shadow-[0_8px_24px_rgba(0,0,0,0.06)]";
    case "clean":
    default:
      return "";
  }
}

export function getBannerOverlayClassName(bannerStyle: ThemeConfig["bannerStyle"]): string | null {
  switch (bannerStyle) {
    case "premium":
      return "pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent";
    case "deal":
      return "pointer-events-none absolute inset-0 bg-gradient-to-r from-[color-mix(in_srgb,var(--theme-danger)_28%,transparent)] to-transparent";
    case "dark":
      return "pointer-events-none absolute inset-0 bg-black/35";
    case "fresh":
      return "pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-[color-mix(in_srgb,var(--theme-primary)_8%,transparent)]";
    default:
      return null;
  }
}
