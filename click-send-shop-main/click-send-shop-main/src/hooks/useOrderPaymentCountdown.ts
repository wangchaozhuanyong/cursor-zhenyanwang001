import { useEffect, useRef, useState } from "react";
import type { Order } from "@/types/order";
import { ORDER_STATUS } from "@/constants/statusDictionary";

type CountdownOrder = Pick<
  Order,
  | "payment_deadline_at"
  | "payment_timeout_enabled"
  | "status"
  | "payment_method"
  | "payment_status"
>;

function remainingSeconds(deadlineIso: string): number {
  const end = new Date(deadlineIso).getTime();
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - Date.now()) / 1000));
}

export function isOrderPaymentCountdownActive(order: CountdownOrder | null | undefined): boolean {
  if (!order) return false;
  if (!order.payment_timeout_enabled || !order.payment_deadline_at) return false;
  if (order.status !== ORDER_STATUS.PENDING) return false;
  if (order.payment_status && order.payment_status !== "pending") return false;
  return true;
}

export function useOrderPaymentCountdown(
  order: CountdownOrder | null | undefined,
  options?: { onExpired?: () => void },
) {
  const active = isOrderPaymentCountdownActive(order);
  const deadline = order?.payment_deadline_at ?? null;
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() =>
    active && deadline ? remainingSeconds(deadline) : null,
  );
  const expiredFired = useRef(false);
  const onExpiredRef = useRef(options?.onExpired);
  onExpiredRef.current = options?.onExpired;

  useEffect(() => {
    expiredFired.current = false;
    if (!active || !deadline) {
      setSecondsLeft(null);
      return;
    }
    const tick = () => {
      const left = remainingSeconds(deadline);
      setSecondsLeft(left);
      if (left <= 0 && !expiredFired.current) {
        expiredFired.current = true;
        onExpiredRef.current?.();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active, deadline]);

  return {
    active,
    secondsLeft: active ? secondsLeft : null,
    expired: active && secondsLeft === 0,
  };
}
