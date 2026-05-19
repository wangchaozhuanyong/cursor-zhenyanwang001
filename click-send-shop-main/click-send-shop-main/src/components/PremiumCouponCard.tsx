import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Clock, Loader2, Package, Tag, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import StoreButton from "@/components/ui/StoreButton";
import {
  formatCouponActionLabel,
  getCouponCardPresentation,
  resolveCouponCardLayout,
  type CouponCardLayout,
} from "@/utils/couponCardTheme";

interface PremiumCouponCardProps {
  title: string;
  /** @deprecated 请使用 amount */
  amountPrefix?: string;
  amount: string;
  /** @deprecated 请使用 minSpendText */
  conditionText?: string;
  minSpendText?: string;
  expireText: string;
  scopeText?: string;
  /** @deprecated 未使用 */
  badge?: string;
  actionLabel?: string;
  actionLoading?: boolean;
  actionDisabled?: boolean;
  disabled?: boolean;
  selected?: boolean;
  /** 展示密度；优先于 compact / homeCompact */
  layout?: CouponCardLayout;
  /** @deprecated 请使用 layout="compact" */
  compact?: boolean;
  /** @deprecated 请使用 layout="home" */
  homeCompact?: boolean;
  colorScheme?: "auto" | "invite";
  className?: string;
  onClick?: () => void;
  onAction?: () => void;
}

function VerticalActionLabel({ label }: { label: string }) {
  const chars = Array.from(label);
  return (
    <span className="inline-flex flex-col items-center justify-center gap-0 leading-none tracking-tight">
      {chars.map((ch, i) => (
        <span key={`${ch}-${i}`} className="block text-[11px] font-semibold leading-[1.15]">
          {ch}
        </span>
      ))}
    </span>
  );
}

function HorizontalActionLabel({ label }: { label: string }) {
  return (
    <span className="block max-w-full text-center text-[10px] font-semibold leading-tight sm:text-[11px]">
      {label}
    </span>
  );
}

function CouponInfoRow({
  icon: Icon,
  children,
  prominent = false,
  mutedClass,
  iconClass,
  titleClass,
}: {
  icon: LucideIcon;
  children: ReactNode;
  prominent?: boolean;
  mutedClass: string;
  iconClass: string;
  titleClass?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <span
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border border-[var(--theme-border)] bg-[var(--theme-bg)]"
        aria-hidden
      >
        <Icon size={10} className={iconClass} strokeWidth={1.75} />
      </span>
      <p
        className={cn(
          "min-w-0 flex-1 leading-snug",
          prominent
            ? cn("line-clamp-2 text-[13px] font-bold", titleClass)
            : cn("truncate text-[11px]", mutedClass),
        )}
      >
        {children}
      </p>
    </div>
  );
}

export default function PremiumCouponCard({
  title,
  amountPrefix = "",
  amount,
  conditionText,
  minSpendText: minSpendTextProp,
  expireText,
  scopeText = "适用范围：全场商品",
  actionLabel,
  actionLoading = false,
  actionDisabled = false,
  disabled = false,
  selected = false,
  layout: layoutProp,
  compact = false,
  homeCompact = false,
  colorScheme = "auto",
  className = "",
  onClick,
  onAction,
}: PremiumCouponCardProps) {
  const { themeConfig } = useThemeRuntime();
  const layout = resolveCouponCardLayout({ layout: layoutProp, compact, homeCompact });
  const skin = getCouponCardPresentation(themeConfig.couponStyle, layout, colorScheme === "invite");

  const minSpendText = minSpendTextProp ?? conditionText ?? "无门槛可用";
  const leftValue = `${amountPrefix}${amount}`.trim();
  const expireLabel = expireText.includes("有效期") ? expireText : `有效期至：${expireText}`;
  const displayActionLabel = actionLabel ? formatCouponActionLabel(actionLabel, layout) : "";

  const infoRows: Array<{ icon: LucideIcon; prominent: boolean; text: string }> = [
    { icon: Tag, prominent: true, text: title },
    { icon: Wallet, prominent: false, text: minSpendText },
    { icon: Clock, prominent: false, text: expireLabel },
  ];
  if (skin.showScope) {
    infoRows.push({ icon: Package, prominent: false, text: scopeText });
  }

  const actionButtonInner = actionLoading ? (
    <Loader2 size={layout === "home" ? 14 : 16} className="animate-spin shrink-0" />
  ) : skin.actionLayout === "vertical" ? (
    <VerticalActionLabel label={displayActionLabel} />
  ) : (
    <HorizontalActionLabel label={displayActionLabel} />
  );

  const actionButton = displayActionLabel ? (
    skin.useThemedMarketingShell ? (
      <button
        type="button"
        disabled={actionDisabled || actionLoading || disabled}
        onClick={(e) => {
          e.stopPropagation();
          onAction?.();
        }}
        className={skin.actionButtonClass}
        style={{ background: "var(--theme-coupon-card-cta-bg)" }}
      >
        {actionButtonInner}
      </button>
    ) : (
      <StoreButton
        size={layout === "default" ? "md" : "sm"}
        variant="primary"
        disabled={actionDisabled || actionLoading || disabled}
        onClick={(e) => {
          e.stopPropagation();
          onAction?.();
        }}
        className={skin.actionButtonClass}
      >
        {actionButtonInner}
      </StoreButton>
    )
  ) : null;

  const wrapper = (
    <div
      data-theme-coupon-style={skin.couponStyle}
      data-coupon-card-layout={layout}
      className={cn(
        "relative grid w-full min-w-0 items-stretch gap-0 overflow-hidden rounded-xl border",
        skin.useThemedMarketingShell ? "border-[var(--theme-coupon-card-shell-border)]" : "border-[var(--theme-border)]",
        skin.cardPadding,
        skin.gridClass,
        skin.shellClass,
        disabled && "opacity-60",
        selected && "ring-2 ring-[var(--theme-primary)]",
        className,
      )}
    >
      <div className={cn("flex min-h-[3.25rem] flex-col items-center justify-center rounded-lg px-1.5 py-1 text-center", skin.valuePaneClass)}>
        <p className={cn(skin.amountSize, "font-black tracking-tight text-[var(--theme-price)]")}>{leftValue}</p>
      </div>

      <div
        className={cn(
          "relative flex min-w-0 flex-col justify-center",
          skin.infoGap,
          skin.infoPadding,
        )}
      >
        <span aria-hidden className={cn(skin.columnRuleClass, "absolute bottom-2 top-2 left-0")} />
        {actionButton ? (
          <span aria-hidden className={cn(skin.columnRuleClass, "absolute bottom-2 top-2 right-0")} />
        ) : null}
        {infoRows.map((row, index) => (
          <CouponInfoRow
            key={`info-${index}`}
            icon={row.icon}
            prominent={row.prominent}
            titleClass={skin.titleClass}
            mutedClass={skin.mutedClass}
            iconClass={skin.iconClass}
          >
            {row.text}
          </CouponInfoRow>
        ))}
      </div>

      {actionButton ? <div className="flex w-full min-w-0 items-stretch justify-center">{actionButton}</div> : null}
    </div>
  );

  if (!onClick) return wrapper;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="w-full min-w-0 text-left">
      {wrapper}
    </button>
  );
}
