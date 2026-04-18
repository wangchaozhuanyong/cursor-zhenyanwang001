import { ORDER_STATUS_META } from "@/constants/statusDictionary";

const statusConfig: Record<string, { label: string; className: string }> = {
  ...Object.fromEntries(
    Object.entries(ORDER_STATUS_META).map(([key, value]) => [
      key,
      { label: value.label, className: value.badgeClass },
    ]),
  ),
  copied: { label: "已复制", className: "bg-indigo-500/15 text-indigo-600" },
  sent: { label: "已发送", className: "bg-indigo-500/15 text-indigo-600" },
  confirmed: { label: "已确认", className: "bg-emerald-500/15 text-emerald-600" },
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: "bg-secondary text-muted-foreground" };

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}
