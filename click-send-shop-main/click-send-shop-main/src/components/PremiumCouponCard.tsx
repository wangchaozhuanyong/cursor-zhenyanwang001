import { Loader2, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import StoreButton from "@/components/ui/StoreButton";
import StoreBadge from "@/components/ui/StoreBadge";

interface PremiumCouponCardProps {
  eyebrow?: string;
  title: string;
  amountPrefix?: string;
  amount: string;
  conditionText: string;
  expireText: string;
  scopeText?: string;
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

export default function PremiumCouponCard({
  eyebrow = "活动优惠券",
  title,
  amountPrefix = "RM",
  amount,
  conditionText,
  expireText,
  scopeText = "适用范围：全场商品",
  badge,
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

  const styleMap: Record<typeof couponStyle, string> = {
    ticket: "bg-[var(--theme-surface)] border-dashed",
    premium:
      "bg-[linear-gradient(120deg,color-mix(in_srgb,var(--theme-secondary)_22%,white),color-mix(in_srgb,var(--theme-primary)_10%,white))]",
    deal:
      "bg-[linear-gradient(120deg,color-mix(in_srgb,var(--theme-danger)_18%,white),color-mix(in_srgb,var(--theme-warning)_16%,white))]",
    minimal: "bg-[var(--theme-surface)]",
  };

  const dense = compact || homeCompact;
  const amountSize = homeCompact ? "text-xl leading-none sm:text-2xl" : compact ? "text-2xl" : "text-3xl";

  const actionButton = actionLabel ? (
    <StoreButton
      size={dense ? "sm" : "md"}
      variant={couponStyle === "deal" ? "danger" : "primary"}
      disabled={actionDisabled || actionLoading || disabled}
      onClick={(e) => {
        e.stopPropagation();
        onAction?.();
      }}
      className={
        homeCompact
          ? "!h-10 !min-h-10 w-full !rounded-lg px-2 text-[11px] font-semibold leading-tight"
          : "min-h-[96px] h-full w-full px-0 text-xs leading-tight [writing-mode:vertical-rl]"
      }
    >
      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : actionLabel}
    </StoreButton>
  ) : null;

  const wrapper = homeCompact ? (
    <div
      className={cn(
        "relative grid w-full grid-cols-[minmax(4.5rem,26%)_minmax(0,1fr)_minmax(4.25rem,22%)] items-stretch gap-2 rounded-xl border border-[var(--theme-border)] p-2.5 text-[var(--theme-text)]",
        styleMap[couponStyle],
        disabled && "opacity-60",
        selected && "ring-2 ring-[var(--theme-secondary)]",
        className,
      )}
    >
      <div className="flex min-h-[5.5rem] flex-col items-center justify-center gap-0.5 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-1.5 py-2 text-center">
        {amountPrefix ? (
          <p className="text-[10px] leading-none text-[var(--theme-muted)]">{amountPrefix}</p>
        ) : null}
        <p className={cn(amountSize, "font-black text-[var(--theme-price)]")}>{amount}</p>
        <p className="line-clamp-2 text-[10px] leading-snug text-[var(--theme-muted)]">{conditionText}</p>
      </div>

      <div className="flex min-h-[5.5rem] min-w-0 flex-col justify-center gap-1 py-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <Ticket size={14} className="shrink-0 text-[var(--theme-secondary)]" />
          <p className="truncate text-[11px] text-[var(--theme-muted)]">{eyebrow}</p>
          {badge ? <StoreBadge type="coupon">{badge}</StoreBadge> : null}
        </div>
        <p className="line-clamp-2 text-sm font-bold leading-snug text-[var(--theme-text-on-surface)]">{title}</p>
        <p className="truncate text-xs text-[var(--theme-muted)]">有效期至：{expireText}</p>
        <p className="line-clamp-1 text-xs text-[var(--theme-muted)]">{scopeText}</p>
      </div>

      {actionButton ? (
        <div className="flex min-h-[5.5rem] items-center justify-center">{actionButton}</div>
      ) : null}
    </div>
  ) : (
    <div
      className={cn(
        "relative flex w-full items-stretch gap-2 rounded-xl border border-[var(--theme-border)] p-3 text-[var(--theme-text)]",
        styleMap[couponStyle],
        disabled && "opacity-60",
        selected && "ring-2 ring-[var(--theme-secondary)]",
        className,
      )}
    >
      <div className="flex w-[32%] shrink-0 flex-col justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-3 text-center">
        {amountPrefix ? <p className="text-xs text-[var(--theme-muted)]">{amountPrefix}</p> : null}
        <p className={cn(amountSize, "font-black text-[var(--theme-price)]")}>{amount}</p>
        <p className="mt-1 text-[10px] text-[var(--theme-muted)]">{conditionText}</p>
      </div>
      <div className="min-w-0 flex-1 py-1">
        <div className="mb-1 flex items-center gap-2">
          <Ticket size={14} className="text-[var(--theme-secondary)]" />
          <p className="text-[11px] text-[var(--theme-muted)]">{eyebrow}</p>
          {badge ? <StoreBadge type="coupon">{badge}</StoreBadge> : null}
        </div>
        <p className={cn(compact ? "line-clamp-1" : "line-clamp-2", "text-sm font-bold")}>{title}</p>
        <p className={cn(compact ? "mt-1 truncate" : "mt-2", "text-xs text-[var(--theme-muted)]")}>
          有效期至：{expireText}
        </p>
        <p className="mt-1 line-clamp-1 text-xs text-[var(--theme-muted)]">{scopeText}</p>
      </div>
      {actionButton ? (
        <div className="flex w-[48px] shrink-0 items-center justify-center">{actionButton}</div>
      ) : null}
    </div>
  );

  if (!onClick) return wrapper;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="w-full text-left">
      {wrapper}
    </button>
  );
}
