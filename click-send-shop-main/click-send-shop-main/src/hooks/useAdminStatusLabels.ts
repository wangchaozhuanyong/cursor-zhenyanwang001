import { useMemo } from "react";
import type { OrderStatus, PaymentStatus } from "@/types/order";
import type { ReturnStatus } from "@/types/return";
import { ORDER_STATUS, PAYMENT_STATUS, RETURN_STATUS } from "@/constants/statusDictionary";
import { useAdminT } from "@/hooks/useAdminT";

export function useAdminOrderStatusLabel(status: string): string {
  const { t } = useAdminT();
  const key = `status.order.${status}`;
  const label = t(key);
  return label !== key ? label : t("status.unknownOrder");
}

export function useAdminPaymentStatusLabel(status: string): string {
  const { t } = useAdminT();
  const key = `status.payment.${status}`;
  const label = t(key);
  return label !== key ? label : t("status.unknownPayment");
}

export function useAdminReturnStatusLabel(status: string): string {
  const { t } = useAdminT();
  const key = `status.return.${status}`;
  const label = t(key);
  return label !== key ? label : t("status.unknownReturn");
}

export function useAdminOrderStatusFilterOptions() {
  const { t } = useAdminT();
  return useMemo(
    () =>
      (["", ...Object.values(ORDER_STATUS)] as Array<"" | OrderStatus>).map((value) => ({
        value,
        label: t(`status.orderFilter.${value}`),
      })),
    [t],
  );
}

export function useAdminPaymentStatusFilterOptions() {
  const { t } = useAdminT();
  return useMemo(
    () =>
      (["", ...Object.values(PAYMENT_STATUS)] as Array<"" | PaymentStatus>).map((value) => ({
        value,
        label: t(`status.paymentFilter.${value}`),
      })),
    [t],
  );
}

export function useAdminReturnStatusFilterOptions() {
  const { t } = useAdminT();
  return useMemo(
    () =>
      (
        [
          { key: "all" as const, value: "" as const },
          ...Object.values(RETURN_STATUS).map((s) => ({ key: s, value: s })),
        ] as Array<{ key: "all" | ReturnStatus; value: "" | ReturnStatus }>
      ).map(({ key, value }) => ({
        key,
        value,
        label: t(`status.returnFilter.${key}`),
      })),
    [t],
  );
}
