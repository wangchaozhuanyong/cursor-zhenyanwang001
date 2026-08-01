import type { KeyboardEvent } from "react";
import { Check, Clock3, Loader2, ShoppingBag, Ticket } from "lucide-react";
import "@/styles/premium-coupon-card.css";
import { cn } from "@/lib/utils";
import type { CouponCardLayout } from "@/utils/couponCardTheme";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

interface PremiumCouponCardProps {
  title: string;
  amount: string;
  minSpendText?: string;
  expireText: string;
  scopeText?: string;
  statusLabel?: string;
  actionLabel?: string;
  actionLoading?: boolean;
  actionDisabled?: boolean;
  disabled?: boolean;
  selected?: boolean;
  layout?: CouponCardLayout;
  colorScheme?: "auto" | "invite";
  infoFieldOrder?: "titleFirst" | "thresholdFirst";
  className?: string;
  onClick?: () => void;
  onAction?: () => void;
}

function splitAmount(amount: string) {
  const normalized = amount.trim();
  const rm = normalized.match(/^RM\s*(.+)$/i);
  const percent = normalized.match(/^(\d+(?:\.\d+)?)%$/);
  if (rm) return { prefix: "RM", value: rm[1], suffix: "" };
  if (percent) return { prefix: "", value: percent[1], suffix: "%" };
  return { prefix: "", value: normalized, suffix: "" };
}

function couponKindLabel(amount: string) {
  if (/%$/.test(amount.trim())) return "折扣券";
  if (/^RM/i.test(amount.trim())) return "现金券";
  if (/免运|包邮/.test(amount)) return "运费券";
  return "优惠券";
}

export default function PremiumCouponCard({
  title,
  amount,
  minSpendText = "无门槛可用",
  expireText,
  scopeText = "适用范围：全场商品",
  statusLabel,
  actionLabel,
  actionLoading = false,
  actionDisabled = false,
  disabled = false,
  selected = false,
  layout = "default",
  colorScheme = "auto",
  infoFieldOrder = "titleFirst",
  className = "",
  onClick,
  onAction,
}: PremiumCouponCardProps) {
  const amountParts = splitAmount(amount);
  const isInteractive = Boolean(onClick) && !disabled;
  const rows = infoFieldOrder === "thresholdFirst"
    ? [
        { icon: ShoppingBag, text: minSpendText, strong: false },
        { icon: Ticket, text: title, strong: true },
      ]
    : [
        { icon: Ticket, text: title, strong: true },
        { icon: ShoppingBag, text: minSpendText, strong: false },
      ];

  const activate = () => {
    if (!isInteractive) return;
    onClick?.();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isInteractive || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    activate();
  };

  return (
    <div
      className={cn(
        "sf-next-coupon-card",
        selected && "is-selected",
        disabled && "is-disabled",
        isInteractive && "is-interactive",
        className,
      )}
      data-coupon-card-layout={layout}
      data-coupon-color-scheme={colorScheme}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-pressed={isInteractive ? selected : undefined}
      aria-disabled={disabled || undefined}
      onClick={activate}
      onKeyDown={handleKeyDown}
    >
      <div className="sf-next-coupon-card__value-pane">
        <span className="sf-next-coupon-card__kind">{couponKindLabel(amount)}</span>
        <p className="sf-next-coupon-card__value" aria-label={amount}>
          {amountParts.prefix ? <span>{amountParts.prefix}</span> : null}
          <strong>{amountParts.value}</strong>
          {amountParts.suffix ? <span>{amountParts.suffix}</span> : null}
        </p>
        {statusLabel ? <span className="sf-next-coupon-card__status">{statusLabel}</span> : null}
      </div>

      <div className="sf-next-coupon-card__info-pane">
        {rows.map(({ icon: Icon, text, strong }) => (
          <div
            key={`${strong ? "title" : "condition"}-${text}`}
            className={cn("sf-next-coupon-card__info-row", strong && "sf-next-coupon-card__info-row--title")}
          >
            <Icon size={14} aria-hidden />
            {strong ? <strong>{text}</strong> : <span>{text}</span>}
          </div>
        ))}
        <div className="sf-next-coupon-card__info-row">
          <Clock3 size={14} aria-hidden />
          <span>{expireText}</span>
        </div>
        {layout === "default" && scopeText ? <p className="sf-next-coupon-card__scope">{scopeText}</p> : null}
      </div>

      <div className="sf-next-coupon-card__action-pane">
        {selected ? (
          <span className="sf-next-coupon-card__selected" aria-label="已选择">
            <Check size={15} aria-hidden />
          </span>
        ) : null}
        {actionLabel ? (
          <UnifiedButton
            type="button"
            className="sf-next-coupon-card__action-button"
            disabled={actionDisabled || actionLoading || disabled}
            onClick={(event) => {
              event.stopPropagation();
              onAction?.();
            }}
          >
            {actionLoading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : actionLabel}
          </UnifiedButton>
        ) : (
          <span className="sf-next-coupon-card__availability">{disabled ? "不可用" : "可使用"}</span>
        )}
      </div>
    </div>
  );
}
