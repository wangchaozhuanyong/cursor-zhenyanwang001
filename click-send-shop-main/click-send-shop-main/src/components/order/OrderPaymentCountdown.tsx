import { Clock } from "lucide-react";
import { formatPaymentCountdown } from "@/utils/orderPaymentTimeout";
import { useOrderPaymentCountdown } from "@/hooks/useOrderPaymentCountdown";
import type { Order } from "@/types/order";

type CountdownOrder = Pick<
  Order,
  | "payment_deadline_at"
  | "payment_timeout_enabled"
  | "payment_timeout_minutes"
  | "status"
  | "payment_method"
  | "payment_status"
>;

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
          <p className="font-medium">支付时间已结束，订单将自动取消。请刷新页面查看最新状态。</p>
        ) : (
          <>
            <p className="font-medium text-foreground">
              请在 <span className="font-mono tabular-nums text-[var(--theme-price)]">{timeText}</span> 内完成支付
            </p>
            {order.payment_timeout_minutes != null && !compact && (
              <p className="mt-0.5 text-[11px] opacity-80">
                超时未付款将自动取消订单并释放库存（限时 {order.payment_timeout_minutes} 分钟）。
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
