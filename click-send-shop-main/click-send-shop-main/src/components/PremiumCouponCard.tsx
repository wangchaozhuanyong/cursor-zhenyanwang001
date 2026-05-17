import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Clock, Loader2, Package, Tag, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import StoreButton from "@/components/ui/StoreButton";

interface PremiumCouponCardProps {
  title: string;
  /** @deprecated ???????????? amount */
  amountPrefix?: string;
  amount: string;
  /** @deprecated ??? minSpendText */
  conditionText?: string;
  minSpendText?: string;
  /** ????????????????????? */
  expireText: string;
  scopeText?: string;
  /** @deprecated ?3 ???????? */
  badge?: string;
  actionLabel?: string;
  actionLoading?: boolean;
  actionDisabled?: boolean;
  disabled?: boolean;
  selected?: boolean;
  compact?: boolean;
  homeCompact?: boolean;
  className?: string;
  onClick?: () => void;
  onAction?: () => void;
}

function VerticalActionLabel({ label }: { label: string }) {
  const chars = Array.from(label);
  return (
    <span className="inline-flex flex-col items-center justify-center gap-0.5 leading-none tracking-tight">
      {chars.map((ch, i) => (
        <span key={`${ch}-${i}`} className="block text-[13px] font-semibold">
          {ch}
        </span>
      ))}
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
    <div className="flex min-w-0 items-center gap-2">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--theme-border)] bg-[var(--theme-bg)]"
        aria-hidden
      >
        <Icon size={14} className={iconClass} strokeWidth={1.75} />
      </span>
      <p
        className={cn(
          "min-w-0 flex-1 leading-snug",
          prominent
            ? cn("line-clamp-2 text-sm font-bold", titleClass)
            : cn("truncate text-xs", mutedClass),
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
  scopeText = "\u9002\u7528\u8303\u56f4\uff1a\u5168\u573a\u5546\u54c1",
  actionLabel,
  actionLoading = false,
  actionDisabled = false,
  disabled = false,
  selected = false,
  compact = false,
  homeCompact = false,
  className = "",
  onClick,
  onAction,
}: PremiumCouponCardProps) {
  const { themeConfig } = useThemeRuntime();
  const couponStyle = themeConfig.couponStyle;
  const minSpendText = minSpendTextProp ?? conditionText ?? "\u65e0\u95e8\u69db\u53ef\u7528";
  const leftValue = `${amountPrefix}${amount}`.trim();
  const expireLabel = expireText.includes("\u6709\u6548\u671f") ? expireText : `\u6709\u6548\u671f\u81f3\uff1a${expireText}`;

  const styleMap: Record<typeof couponStyle, string> = {
    ticket: "bg-[var(--theme-surface)] border-dashed",
    premium:
      "bg-[linear-gradient(120deg,color-mix(in_srgb,var(--theme-secondary)_22%,white),color-mix(in_srgb,var(--theme-primary)_10%,white))]",
    deal:
      "bg-[linear-gradient(120deg,color-mix(in_srgb,var(--theme-danger)_18%,white),color-mix(in_srgb,var(--theme-warning)_16%,white))]",
    minimal: "bg-[var(--theme-surface)]",
  };

  const lightCouponBg = couponStyle === "premium" || couponStyle === "deal";
  const couponTitleClass = lightCouponBg ? "text-[#1a1612]" : "text-[var(--theme-text-on-surface)]";
  const couponMutedClass = lightCouponBg ? "text-[#5c5348]" : "text-[var(--theme-muted)]";
  const couponIconClass = lightCouponBg
    ? "text-[color-mix(in_srgb,var(--theme-secondary)_75%,#1a1612)]"
    : "text-[var(--theme-secondary)]";

  const dense = compact || homeCompact;
  const amountSize = homeCompact ? "text-2xl leading-none sm:text-3xl" : compact ? "text-2xl" : "text-3xl";

  const actionButton = actionLabel ? (
    <StoreButton
      size={dense ? "sm" : "md"}
      variant={couponStyle === "deal" ? "danger" : "primary"}
      disabled={actionDisabled || actionLoading || disabled}
      onClick={(e) => {
        e.stopPropagation();
        onAction?.();
      }}
      className="flex h-full min-h-[5.25rem] w-full min-w-[2.75rem] max-w-[3.25rem] flex-col items-center justify-center !rounded-lg px-1 py-2"
    >
      {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <VerticalActionLabel label={actionLabel} />}
    </StoreButton>
  ) : null;

  const wrapper = (
    <div
      data-theme-coupon-style={couponStyle}
      className={cn(
        "relative grid w-full items-stretch gap-0 overflow-hidden rounded-xl border border-[var(--theme-border)] p-2",
        homeCompact
          ? "grid-cols-[minmax(4.75rem,24%)_minmax(0,1fr)_minmax(2.75rem,3.25rem)]"
          : "grid-cols-[minmax(5.5rem,26%)_minmax(0,1fr)_minmax(2.75rem,3.25rem)]",
        styleMap[couponStyle],
        disabled && "opacity-60",
        selected && "ring-2 ring-[var(--theme-secondary)]",
        className,
      )}
    >
      <div className="flex min-h-[5.25rem] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-3 text-center">
        <p className={cn(amountSize, "font-black tracking-tight text-[var(--theme-price)]")}>{leftValue}</p>
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-col justify-center border-x border-dashed border-[var(--theme-border)]",
          homeCompact ? "min-h-[5.5rem] gap-1 px-2 py-0.5" : "min-h-[5.25rem] gap-1.5 px-2.5 py-1",
        )}
      >
        <CouponInfoRow icon={Tag} prominent titleClass={couponTitleClass} mutedClass={couponMutedClass} iconClass={couponIconClass}>
          {title}
        </CouponInfoRow>
        <CouponInfoRow icon={Wallet} mutedClass={couponMutedClass} iconClass={couponIconClass}>
          {minSpendText}
        </CouponInfoRow>
        <CouponInfoRow icon={Clock} mutedClass={couponMutedClass} iconClass={couponIconClass}>
          {expireLabel}
        </CouponInfoRow>
        <CouponInfoRow icon={Package} mutedClass={couponMutedClass} iconClass={couponIconClass}>
          {scopeText}
        </CouponInfoRow>
      </div>

      {actionButton ? <div className="flex items-stretch justify-center pl-1">{actionButton}</div> : null}
    </div>
  );

  if (!onClick) return wrapper;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="w-full text-left">
      {wrapper}
    </button>
  );
}
