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
  /** premium/deal 或 forceInvitePalette：使用优惠券活动专属 shell + CTA 令牌（--theme-coupon-card-*） */
  useThemedMarketingShell: boolean;
  shellClass: string;
  gridClass: string;
  titleClass: string;
  mutedClass: string;
  iconClass: string;
  valuePaneClass: string;
  columnRuleClass: string;
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
  forceInvitePalette = false,
): CouponCardPresentation {
  const useThemedMarketingShell = forceInvitePalette || couponStyle === "premium" || couponStyle === "deal";

  const shellByStyle: Record<CouponStyle, string> = {
    ticket: "bg-[var(--theme-surface)] border border-[var(--theme-border)]",
    premium: "bg-theme-coupon-card-shell",
    deal: "bg-theme-coupon-card-shell",
    minimal: "bg-[var(--theme-surface)] border border-[var(--theme-border)]",
  };

  const titleClass = useThemedMarketingShell
    ? "text-[var(--theme-coupon-card-shell-fg)]"
    : "text-[var(--theme-text-on-surface)]";

  const mutedClass = useThemedMarketingShell
    ? "theme-coupon-card-muted"
    : "text-[var(--theme-text-muted-on-surface)]";

  const iconClass = useThemedMarketingShell
    ? THEME_COUPON_ICON_ON_LIGHT_CLASS
    : THEME_COUPON_ICON_ON_SURFACE_CLASS;

  const valuePaneClass = useThemedMarketingShell
    ? "bg-[var(--theme-coupon-card-value-pane-bg)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--theme-coupon-card-shell-border)_42%,transparent)]"
    : "bg-[var(--theme-bg)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--theme-border)_55%,transparent)]";

  const columnRuleClass = useThemedMarketingShell
    ? "coupon-card-column-rule coupon-card-column-rule--themed"
    : "coupon-card-column-rule";

  const gridByLayout: Record<CouponCardLayout, string> = {
    home: "grid-cols-[5.55rem_minmax(0,1fr)_3.05rem]",
    compact: "grid-cols-[6.7rem_minmax(0,1fr)_4.35rem]",
    default: "grid-cols-[7.1rem_minmax(0,1fr)_4.65rem]",
  };

  const amountSizeByLayout: Record<CouponCardLayout, string> = {
    home: "store-coupon-amount-home",
    compact: "store-coupon-amount-list",
    default: "store-coupon-amount-list",
  };

  /** 操作区统一竖排一字一行（如「使」「用」），贴右侧窄条 */
  const actionLayout: CouponCardPresentation["actionLayout"] = "vertical";

  const actionButtonClass = useThemedMarketingShell
    ? layout === "home"
      ? "flex h-full min-h-[3.25rem] w-full min-w-0 max-w-full flex-col items-center justify-center self-stretch rounded-lg px-0.5 py-1.5 text-[var(--theme-coupon-card-cta-fg)] shadow-sm transition active:scale-[0.98] disabled:opacity-60"
      : "flex h-full min-h-[3.25rem] w-full min-w-0 max-w-full items-center justify-center self-stretch rounded-xl px-2 py-2 text-[var(--theme-coupon-card-cta-fg)] shadow-sm transition active:scale-[0.98] disabled:opacity-60"
    : "flex h-full min-h-[3.25rem] w-full min-w-0 max-w-full flex-col items-center justify-center self-stretch !h-auto !px-1 !py-1.5 !rounded-lg";

  return {
    couponStyle,
    layout,
    useThemedMarketingShell,
    shellClass: useThemedMarketingShell ? "bg-theme-coupon-card-shell" : shellByStyle[couponStyle],
    gridClass: gridByLayout[layout],
    titleClass,
    mutedClass,
    iconClass,
    valuePaneClass,
    columnRuleClass,
    amountSize: amountSizeByLayout[layout],
    showScope: false,
    infoGap: layout === "home" ? "gap-px" : "gap-px",
    infoPadding: layout === "home" ? "px-1.5 py-0.5" : layout === "compact" ? "px-2 py-0.5" : "px-2.5 py-1",
    actionLayout,
    actionButtonClass,
    cardPadding: layout === "home" ? "p-1.5" : "p-2",
  };
}
