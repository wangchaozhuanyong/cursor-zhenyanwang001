import type { CouponStyle } from "@/types/theme";
import {
  THEME_COUPON_ICON_ON_DEAL_CLASS,
  THEME_COUPON_ICON_ON_LIGHT_CLASS,
  THEME_COUPON_ICON_ON_SURFACE_CLASS,
} from "@/utils/themeVisuals";

/** 优惠券卡片展示密度（与皮肤 couponStyle 正交） */
export type CouponCardLayout = "default" | "compact" | "home";

const HOME_ACTION_LABELS: Record<string, string> = {
  立即领取: "领取",
  去使用: "使用",
  注册领取: "领取",
  注册领: "领取",
  领取: "领取",
  使用: "使用",
};

export function resolveCouponCardLayout(props: {
  layout?: CouponCardLayout;
  compact?: boolean;
  homeCompact?: boolean;
}): CouponCardLayout {
  if (props.layout) return props.layout;
  if (props.homeCompact) return "home";
  if (props.compact) return "compact";
  return "default";
}

/** 首页横滑等窄位：缩短按钮文案，避免挤压重叠 */
export function formatCouponActionLabel(label: string, layout: CouponCardLayout): string {
  const text = label.trim();
  if (layout !== "home") return text;
  return HOME_ACTION_LABELS[text] ?? (text.length <= 4 ? text : text.slice(0, 4));
}

export type CouponCardPresentation = {
  couponStyle: CouponStyle;
  layout: CouponCardLayout;
  shellClass: string;
  gridClass: string;
  titleClass: string;
  mutedClass: string;
  iconClass: string;
  buttonVariant: "primary" | "danger";
  amountSize: string;
  showScope: boolean;
  infoGap: string;
  infoPadding: string;
  actionLayout: "horizontal" | "vertical";
  actionButtonClass: string;
  cardPadding: string;
};

export function getCouponCardPresentation(
  couponStyle: CouponStyle,
  layout: CouponCardLayout,
): CouponCardPresentation {
  const lightBg = couponStyle === "premium" || couponStyle === "deal";

  const shellByStyle: Record<CouponStyle, string> = {
    ticket: "bg-[var(--theme-surface)] border-dashed",
    premium:
      "bg-[linear-gradient(120deg,color-mix(in_srgb,var(--theme-secondary)_22%,var(--theme-surface)),color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface)))]",
    deal:
      "bg-[linear-gradient(120deg,color-mix(in_srgb,var(--theme-danger)_18%,var(--theme-surface)),color-mix(in_srgb,var(--theme-warning)_16%,var(--theme-surface)))]",
    minimal: "bg-[var(--theme-surface)]",
  };

  const titleClass = lightBg
    ? couponStyle === "deal"
      ? "text-[var(--theme-coupon-card-deal-fg)]"
      : "text-[var(--theme-coupon-card-premium-fg)]"
    : "text-[var(--theme-text-on-surface)]";

  const mutedClass = lightBg
    ? couponStyle === "deal"
      ? "text-[var(--theme-coupon-card-deal-muted)]"
      : "text-[var(--theme-coupon-card-premium-muted)]"
    : "text-[var(--theme-text-muted-on-surface)]";

  const iconClass = lightBg
    ? couponStyle === "deal"
      ? THEME_COUPON_ICON_ON_DEAL_CLASS
      : THEME_COUPON_ICON_ON_LIGHT_CLASS
    : THEME_COUPON_ICON_ON_SURFACE_CLASS;

  const gridByLayout: Record<CouponCardLayout, string> = {
    home: "grid-cols-[minmax(4.25rem,23%)_minmax(0,1fr)_minmax(4.25rem,5.25rem)]",
    compact: "grid-cols-[minmax(4.75rem,24%)_minmax(0,1fr)_minmax(3rem,3.75rem)]",
    default: "grid-cols-[minmax(5.5rem,26%)_minmax(0,1fr)_minmax(2.75rem,3.25rem)]",
  };

  const amountSizeByLayout: Record<CouponCardLayout, string> = {
    home: "text-xl leading-none sm:text-2xl",
    compact: "text-xl leading-none",
    default: "text-2xl leading-none",
  };

  const actionLayout: CouponCardPresentation["actionLayout"] =
    layout === "default" ? "vertical" : "horizontal";

  const actionButtonClass =
    actionLayout === "horizontal"
      ? "flex h-full min-h-[3.25rem] w-full min-w-0 flex-col items-center justify-center self-stretch !rounded-lg px-1.5 py-2"
      : "flex h-full min-h-0 w-full min-w-[2.75rem] max-w-[3.25rem] flex-col items-center justify-center self-stretch !rounded-lg px-1 py-1.5";

  return {
    couponStyle,
    layout,
    shellClass: shellByStyle[couponStyle],
    gridClass: gridByLayout[layout],
    titleClass,
    mutedClass,
    iconClass,
    buttonVariant: couponStyle === "deal" ? "danger" : "primary",
    amountSize: amountSizeByLayout[layout],
    showScope: layout !== "home",
    infoGap: layout === "home" ? "gap-0.5" : "gap-px",
    infoPadding: layout === "home" ? "px-1.5 py-1" : layout === "compact" ? "px-2 py-0.5" : "px-2.5 py-1",
    actionLayout,
    actionButtonClass,
    cardPadding: layout === "home" ? "p-1.5" : "p-2",
  };
}
