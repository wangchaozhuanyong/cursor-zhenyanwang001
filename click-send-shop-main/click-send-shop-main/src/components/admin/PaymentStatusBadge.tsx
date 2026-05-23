import { getPaymentStatusBadgeClass } from "@/constants/statusDictionary";
import { useAdminPaymentStatusLabel } from "@/hooks/useAdminStatusLabels";

export function PaymentStatusBadge({ status }: { status: string }) {
  const label = useAdminPaymentStatusLabel(status);
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${getPaymentStatusBadgeClass(status)}`}>
      {label}
    </span>
  );
}
