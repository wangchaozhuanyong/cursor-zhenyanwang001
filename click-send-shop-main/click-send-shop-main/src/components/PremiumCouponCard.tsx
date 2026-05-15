import { Loader2, Ticket } from "lucide-react";
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
  const amountSize = homeCompact ? "text-xl sm:text-2xl" : compact ? "text-2xl" : "text-3xl";
  const wrapper = (
    <div
      className={`relative flex w-full items-stretch gap-2 rounded-xl border border-[var(--theme-border)] ${homeCompact ? "p-2.5" : "p-3"} text-[var(--theme-text)] ${styleMap[couponStyle]} ${disabled ? "opacity-60" : ""} ${selected ? "ring-2 ring-[var(--theme-secondary)]" : ""} ${className}`}
    >
      <div className={`flex ${homeCompact ? "w-[29%]" : "w-[32%]"} shrink-0 flex-col justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 text-center`}>
        <p className="text-xs text-[var(--theme-muted)]">{amountPrefix}</p>
        <p className={`${amountSize} font-black leading-none text-[var(--theme-price)]`}>{amount}</p>
        <p className="mt-1 text-[10px] text-[var(--theme-muted)]">{conditionText}</p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <Ticket size={14} className="text-[var(--theme-secondary)]" />
          <p className="text-[11px] text-[var(--theme-muted)]">{eyebrow}</p>
          {badge ? <StoreBadge type="coupon">{badge}</StoreBadge> : null}
        </div>
        <p className={`${homeCompact ? "line-clamp-1" : "line-clamp-2"} text-sm font-bold`}>{title}</p>
        <p className={`${homeCompact ? "mt-1 truncate" : "mt-2"} text-xs text-[var(--theme-muted)]`}>有效期至：{expireText}</p>
        <p className="mt-1 line-clamp-1 text-xs text-[var(--theme-muted)]">{scopeText}</p>
      </div>
      {actionLabel ? (
        <div className={`flex ${homeCompact ? "w-[44px]" : "w-[48px]"} shrink-0 items-center justify-center`}>
          <StoreButton
            size={dense ? "sm" : "md"}
            variant={couponStyle === "deal" ? "danger" : "primary"}
            disabled={actionDisabled || actionLoading || disabled}
            onClick={(e) => {
              e.stopPropagation();
              onAction?.();
            }}
            className={`${homeCompact ? "min-h-[72px]" : "min-h-[96px]"} h-full w-full px-0 text-xs leading-tight [writing-mode:vertical-rl]`}
          >
            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : actionLabel}
          </StoreButton>
        </div>
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
