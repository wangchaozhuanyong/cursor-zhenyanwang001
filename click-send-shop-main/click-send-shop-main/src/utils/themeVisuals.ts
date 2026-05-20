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

/** 状态徽章底纹（订单/支付/售后等） */
export const THEME_BADGE_WARNING =
  "bg-[color-mix(in_srgb,var(--theme-warning)_17%,var(--theme-surface))] text-[color-mix(in_srgb,var(--theme-warning)_72%,var(--theme-text-on-surface))]";
export const THEME_BADGE_SUCCESS =
  "bg-[color-mix(in_srgb,var(--theme-success)_17%,var(--theme-surface))] text-[color-mix(in_srgb,var(--theme-success)_70%,var(--theme-text-on-surface))]";
export const THEME_BADGE_DANGER =
  "bg-[color-mix(in_srgb,var(--theme-danger)_15%,var(--theme-surface))] text-[var(--theme-danger)]";
export const THEME_BADGE_PRIMARY =
  "bg-[color-mix(in_srgb,var(--theme-primary)_15%,var(--theme-surface))] text-[var(--theme-primary)]";
export const THEME_BADGE_PRICE =
  "bg-[color-mix(in_srgb,var(--theme-price)_15%,var(--theme-surface))] text-[var(--theme-price)]";
export const THEME_BADGE_ACCENT =
  "bg-[color-mix(in_srgb,var(--theme-accent)_17%,var(--theme-surface))] text-[color-mix(in_srgb,var(--theme-accent)_70%,var(--theme-text-on-surface))]";
export const THEME_BADGE_MUTED =
  "bg-[color-mix(in_srgb,var(--theme-text-muted)_16%,var(--theme-surface))] text-[color-mix(in_srgb,var(--theme-text-on-surface)_78%,var(--theme-text-muted))]";

/** 列表行图标圆底 */
export const THEME_ROW_ICON_POSITIVE =
  "bg-[color-mix(in_srgb,var(--theme-success)_12%,var(--theme-surface))] text-[var(--theme-success)]";
export const THEME_ROW_ICON_NEGATIVE =
  "bg-[color-mix(in_srgb,var(--theme-danger)_12%,var(--theme-surface))] text-[var(--theme-danger)]";

export const THEME_TEXT_SUCCESS = "text-[var(--theme-success)]";
export const THEME_TEXT_DANGER = "text-[var(--theme-danger)]";
export const THEME_TEXT_WARNING = "text-[var(--theme-warning)]";
export const THEME_TEXT_PRIMARY = "text-[var(--theme-primary)]";

/** 星级（评价等，实心星） */
export const THEME_STAR_FILLED = "fill-[var(--theme-warning)] text-[var(--theme-warning)]";

/** 危险态浅底 / 描边（后台删除、错误提示） */
export const THEME_HOVER_BG_DANGER =
  "hover:bg-[color-mix(in_srgb,var(--theme-danger)_10%,var(--theme-surface))]";
export const THEME_HOVER_BG_DANGER_STRONG =
  "hover:bg-[color-mix(in_srgb,var(--theme-danger)_20%,var(--theme-surface))]";
export const THEME_BG_DANGER_SOFT =
  "bg-[color-mix(in_srgb,var(--theme-danger)_10%,var(--theme-surface))]";
export const THEME_BORDER_DANGER_SOFT =
  "border-[color-mix(in_srgb,var(--theme-danger)_30%,var(--theme-border))]";
export const THEME_BORDER_DANGER_MEDIUM =
  "border-[color-mix(in_srgb,var(--theme-danger)_40%,var(--theme-border))]";
export const THEME_ACTIVE_BG_DANGER =
  "active:bg-[color-mix(in_srgb,var(--theme-danger)_10%,var(--theme-surface))]";
export const THEME_TEXT_FREE_SHIPPING = THEME_TEXT_SUCCESS;

/** 活动/促销提示条 */
export const THEME_ALERT_DANGER_SHELL =
  "border border-[color-mix(in_srgb,var(--theme-danger)_25%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-danger)_10%,var(--theme-surface))] text-[var(--theme-danger)]";

/** 错误提示块（列表页/表单） */
export const THEME_ALERT_ERROR_SOFT =
  "rounded-xl bg-[color-mix(in_srgb,var(--theme-danger)_10%,var(--theme-surface))] text-[var(--theme-danger)]";

/** 带边框的错误提示 */
export const THEME_ALERT_ERROR_BOX =
  "rounded-lg border border-[color-mix(in_srgb,var(--theme-danger)_40%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-danger)_10%,var(--theme-surface))] text-[var(--theme-danger)]";

/** 危险描边按钮 */
export const THEME_BTN_DANGER_OUTLINE =
  "border-2 border-[color-mix(in_srgb,var(--theme-danger)_30%,var(--theme-border))] text-[var(--theme-danger)] hover:bg-[color-mix(in_srgb,var(--theme-danger)_5%,var(--theme-surface))]";

export const THEME_HOVER_TEXT_DANGER = "hover:text-[var(--theme-danger)]";

export const THEME_DANGER_ICON_BTN =
  "bg-[var(--theme-danger)] text-[var(--theme-danger-foreground)]";

/** 后台实心操作按钮 */
export const THEME_BTN_SUCCESS_SOLID =
  "bg-[var(--theme-success)] text-[var(--theme-success-foreground)]";
export const THEME_BTN_DANGER_SOLID = "bg-[var(--theme-danger)] text-[var(--theme-danger-foreground)]";
export const THEME_BTN_PRIMARY_SOLID =
  "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]";

/** 后台描边操作按钮 */
export const THEME_OUTLINE_SUCCESS =
  "border border-[color-mix(in_srgb,var(--theme-success)_40%,var(--theme-border))] text-[var(--theme-success)] hover:bg-[color-mix(in_srgb,var(--theme-success)_8%,var(--theme-surface))]";
export const THEME_OUTLINE_DANGER =
  "border border-[color-mix(in_srgb,var(--theme-danger)_40%,var(--theme-border))] text-[var(--theme-danger)] hover:bg-[color-mix(in_srgb,var(--theme-danger)_8%,var(--theme-surface))]";
export const THEME_OUTLINE_PRIMARY =
  "border border-[color-mix(in_srgb,var(--theme-primary)_40%,var(--theme-border))] text-[var(--theme-primary)] hover:bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))]";
export const THEME_OUTLINE_WARNING =
  "border border-[color-mix(in_srgb,var(--theme-warning)_45%,var(--theme-border))] text-[color-mix(in_srgb,var(--theme-warning)_72%,var(--theme-text-on-surface))] hover:bg-[color-mix(in_srgb,var(--theme-warning)_10%,var(--theme-surface))]";

export const THEME_TEXT_DANGER_SOFT = "text-[var(--theme-danger)]";
export const THEME_TEXT_SUCCESS_SOFT = "text-[var(--theme-success)]";

/** 次要实心按钮（如加购） */
export const THEME_BTN_ACCENT_SOLID =
  "bg-[var(--theme-accent)] text-[var(--theme-accent-foreground)]";

/** 价格色强调文字（等同 text-theme-price，语义更清晰） */
export const THEME_TEXT_PRICE = "text-theme-price";

/** 价格色实心按钮 */
export const THEME_BTN_PRICE = "btn-theme-price";

/** 品牌渐变实心按钮 */
export const THEME_BTN_GRADIENT = "btn-theme-gradient";

/** 选中 Chip / Tab（价格色底） */
export const THEME_CHIP_PRICE_ACTIVE = "btn-theme-price";

/** 优惠券 premium 浅色底上的行内图标 */
export const THEME_COUPON_ICON_ON_LIGHT_CLASS =
  "text-[color-mix(in_srgb,var(--theme-secondary)_75%,var(--theme-coupon-card-premium-fg))]";

/** 优惠券 deal 浅色底上的行内图标 */
export const THEME_COUPON_ICON_ON_DEAL_CLASS =
  "text-[color-mix(in_srgb,var(--theme-danger)_70%,var(--theme-coupon-card-deal-fg))]";

/** 深色/渐变券面上的行内图标 */
export const THEME_COUPON_ICON_ON_SURFACE_CLASS =
  "text-[color-mix(in_srgb,var(--theme-primary)_80%,var(--theme-text-on-surface))]";

/**
 * 优惠券/积分/返现等页顶部强调卡片。
 * 背景/文字由 generateThemePalette 写入 --theme-coupon-accent-*。
 */
export const THEME_ACCENT_HERO_SHELL = "theme-accent-hero bg-theme-coupon-accent";

/** 品牌主渐变 Hero */
export const THEME_GRADIENT_HERO_SHELL = "theme-accent-hero bg-theme-gradient";

export const THEME_ACCENT_HERO_LABEL =
  "theme-hero-accent-label text-xs font-medium uppercase tracking-wider";
export const THEME_ACCENT_HERO_VALUE = "theme-hero-accent-value font-bold";
export const THEME_ACCENT_HERO_MUTED = "theme-hero-accent-muted";
export const THEME_ACCENT_HERO_SUBTLE = "theme-hero-accent-subtle";
export const THEME_ACCENT_HERO_ICON_WRAP =
  "theme-hero-accent-icon-wrap flex items-center justify-center rounded-2xl backdrop-blur-sm";
export const THEME_ACCENT_HERO_ICON = "theme-hero-accent-icon";

/** 个人中心会员卡（随 memberCardStyle + 主题色自动算对比度） */
export const THEME_MEMBER_CARD_SHELL = "bg-theme-member-card";
export const THEME_MEMBER_CARD_MUTED = "theme-member-card-muted";
export const THEME_INVITE_PROMO_SHELL = "bg-theme-invite-promo border";
export const THEME_INVITE_PROMO_MUTED = "theme-invite-promo-muted";
export const THEME_INVITE_PROMO_CTA = "btn-theme-gradient text-xs font-semibold shadow-md";
export const THEME_GIFT_BADGE_SHELL = "bg-theme-gift-badge ring-1";

/** @deprecated 使用 THEME_MEMBER_CARD_SHELL */
export function getMemberCardClassName(_style: ThemeConfig["memberCardStyle"]): string {
  return THEME_MEMBER_CARD_SHELL;
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
      return `${base} border-0 bg-transparent px-[var(--store-page-x)] pb-2 pt-1 shadow-none`;
    case "glass":
      return `${base} border-t border-[color-mix(in_srgb,var(--theme-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--theme-surface)_78%,transparent)] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-md`;
    case "clean":
    default:
      return `${base} border-t border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[0_-8px_24px_rgba(0,0,0,0.08)]`;
  }
}

export function getBottomNavInnerClassName(navStyle: ThemeConfig["navStyle"]): string {
  if (navStyle === "floating") {
    return "w-full overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[0_8px_32px_rgba(0,0,0,0.14)] md:mx-auto md:max-w-lg";
  }
  return "w-full md:mx-auto md:max-w-lg";
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
