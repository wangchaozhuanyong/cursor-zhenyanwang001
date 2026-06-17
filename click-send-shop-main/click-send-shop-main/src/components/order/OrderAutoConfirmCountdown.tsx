import { Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Order } from "@/types/order";
import { usePublicLocale, type PublicLocale } from "@/i18n/publicLocale";

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

function formatAutoConfirmCountdown(secondsLeft: number, locale: PublicLocale): string {
  const s = Math.max(0, Math.floor(secondsLeft));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minsRaw = Math.floor((s % 3600) / 60);
  const mins = s > 0 && days === 0 && hours === 0 ? Math.max(1, minsRaw) : minsRaw;

  if (locale === "en") {
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }
  if (days > 0) return `${days}天 ${hours}小时 ${mins}分钟`;
  if (hours > 0) return `${hours}小时 ${mins}分钟`;
  return `${mins}分钟`;
}

const AUTO_CONFIRM_COPY: Record<PublicLocale, {
  expired: string;
  prefix: string;
  suffix: string;
  rulePrefix: string;
  ruleSuffix: string;
}> = {
  zh: {
    expired: "系统即将自动确认收货",
    prefix: "将于",
    suffix: "后自动确认收货",
    rulePrefix: "发货后超过",
    ruleSuffix: "天未手动确认，订单会自动完成。",
  },
  en: {
    expired: "The system will confirm receipt shortly",
    prefix: "Auto-confirm receipt in",
    suffix: "",
    rulePrefix: "If not manually confirmed within",
    ruleSuffix: "days after shipment, the order will be completed automatically.",
  },
};

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
  const { locale } = usePublicLocale();
  const copy = AUTO_CONFIRM_COPY[locale];
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
        <p className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5 font-medium text-foreground">
          {expired
            ? copy.expired
            : (
                <>
                  <span>{copy.prefix}</span>
                  <span className="font-mono tabular-nums text-[var(--theme-price)] whitespace-nowrap">
                    {formatAutoConfirmCountdown(secondsLeft, locale)}
                  </span>
                  {copy.suffix ? <span>{copy.suffix}</span> : null}
                </>
              )}
        </p>
        {!compact && order.auto_confirm_receive_days != null ? (
          <p className="mt-0.5 text-[11px] opacity-80">
            {copy.rulePrefix} {order.auto_confirm_receive_days} {copy.ruleSuffix}
          </p>
        ) : null}
      </div>
    </div>
  );
}
