import type { OrderStatus } from "@/types/order";
import { getOrderStatusBadgeClass } from "@/constants/statusDictionary";
import { useAdminOrderStatusLabel } from "@/hooks/useAdminStatusLabels";

export function OrderStatusBadge({ status }: { status: OrderStatus | string }) {
  const label = useAdminOrderStatusLabel(String(status));
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${getOrderStatusBadgeClass(status)}`}>
      {label}
    </span>
  );
}
