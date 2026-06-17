import { Clock } from "lucide-react";
import { formatPaymentCountdown } from "@/utils/orderPaymentTimeout";
import { useOrderPaymentCountdown } from "@/hooks/useOrderPaymentCountdown";
import type { Order } from "@/types/order";
import { usePublicLocale, type PublicLocale } from "@/i18n/publicLocale";

type CountdownOrder = Pick<
  Order,
  | "payment_deadline_at"
  | "payment_timeout_enabled"
  | "payment_timeout_minutes"
  | "status"
  | "payment_method"
  | "payment_status"
>;

const PAYMENT_COUNTDOWN_COPY: Record<PublicLocale, {
  expired: string;
  prefix: string;
  suffix: string;
  timeoutPrefix: string;
  timeoutSuffix: string;
}> = {
  zh: {
    expired: "支付时间已结束，订单将自动取消。请刷新页面查看最新状态。",
    prefix: "请在",
    suffix: "内完成支付",
    timeoutPrefix: "超时未付款将自动取消订单并释放库存（限时",
    timeoutSuffix: "分钟）。",
  },
  en: {
    expired: "Payment time has ended. The order will be cancelled automatically. Refresh to see the latest status.",
    prefix: "Complete payment within",
    suffix: "",
    timeoutPrefix: "Unpaid orders are cancelled automatically and stock is released after",
    timeoutSuffix: "minutes.",
  },
};

export function OrderPaymentCountdown({
  order,
  onExpired,
  className = "",
  compact = false,
}: {
  order: CountdownOrder;
  onExpired?: () => void;
  className?: string;
  compact?: boolean;
}) {
  const { locale } = usePublicLocale();
  const copy = PAYMENT_COUNTDOWN_COPY[locale];
  const { active, secondsLeft, expired } = useOrderPaymentCountdown(order, { onExpired });

  if (!active || secondsLeft == null) return null;

  const timeText = expired ? "00:00" : formatPaymentCountdown(secondsLeft);
  const urgent = !expired && secondsLeft < 300;

  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-xs ${
        expired
          ? "border-[color-mix(in_srgb,var(--theme-danger)_40%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-danger)_10%,var(--theme-surface))] text-[var(--theme-danger)]"
          : urgent
            ? "border-[color-mix(in_srgb,var(--theme-warning)_50%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-warning)_10%,var(--theme-surface))] text-[var(--theme-warning)]"
            : "border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-text-muted)]"
      } ${className}`}
      role="status"
      aria-live="polite"
    >
      <Clock size={compact ? 14 : 16} className="mt-0.5 shrink-0 opacity-80" />
      <div className="min-w-0 flex-1">
        {expired ? (
          <p className="font-medium">{copy.expired}</p>
        ) : (
          <>
            <p className="font-medium text-foreground">
              {copy.prefix} <span className="font-mono tabular-nums text-[var(--theme-price)]">{timeText}</span> {copy.suffix}
            </p>
            {order.payment_timeout_minutes != null && !compact ? (
              <p className="mt-0.5 text-[11px] opacity-80">
                {copy.timeoutPrefix} {order.payment_timeout_minutes} {copy.timeoutSuffix}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
