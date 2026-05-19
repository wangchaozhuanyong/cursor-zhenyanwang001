import { Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Order } from "@/types/order";
import { formatPaymentCountdown } from "@/utils/orderPaymentTimeout";

type CountdownOrder = Pick<
  Order,
  | "status"
  | "shipped_at"
  | "auto_confirm_receive_enabled"
  | "auto_confirm_receive_days"
  | "auto_confirm_receive_deadline_at"
>;

function getSecondsLeft(deadlineAt: string | null | undefined): number {
  if (!deadlineAt) return 0;
  const end = new Date(deadlineAt).getTime();
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - Date.now()) / 1000));
}

function isActive(order: CountdownOrder | null | undefined) {
  return !!(
    order
    && order.status === "shipped"
    && order.auto_confirm_receive_enabled
    && order.auto_confirm_receive_deadline_at
  );
}

export function OrderAutoConfirmCountdown({
  order,
  compact = false,
  className = "",
}: {
  order: CountdownOrder;
  compact?: boolean;
  className?: string;
}) {
  const active = isActive(order);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() =>
    active ? getSecondsLeft(order.auto_confirm_receive_deadline_at) : null,
  );

  useEffect(() => {
    if (!active) {
      setSecondsLeft(null);
      return;
    }
    const tick = () => setSecondsLeft(getSecondsLeft(order.auto_confirm_receive_deadline_at));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active, order.auto_confirm_receive_deadline_at]);

  const expired = useMemo(() => (secondsLeft ?? 0) <= 0, [secondsLeft]);
  if (!active || secondsLeft == null) return null;

  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-xs ${
        expired
          ? "border-[color-mix(in_srgb,var(--theme-primary)_35%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))] text-[var(--theme-text-muted)]"
          : "border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-text-muted)]"
      } ${className}`}
      role="status"
      aria-live="polite"
    >
      <Clock3 size={compact ? 14 : 16} className="mt-0.5 shrink-0 opacity-80" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">
          {expired
            ? "系统即将自动确认收货"
            : <>将于 <span className="font-mono tabular-nums text-[var(--theme-price)]">{formatPaymentCountdown(secondsLeft)}</span> 后自动确认收货</>}
        </p>
        {!compact && order.auto_confirm_receive_days != null ? (
          <p className="mt-0.5 text-[11px] opacity-80">
            发货后超过 {order.auto_confirm_receive_days} 天未手动确认，订单会自动完成。
          </p>
        ) : null}
      </div>
    </div>
  );
}

