import { Tx } from "@/components/admin/AdminText";
import { NavLink } from "react-router-dom";
import { useAdminT } from "@/hooks/useAdminT";

const tabs = [
  { to: "/admin/payments/channels", label: "渠道配置" },
  { to: "/admin/payments/orders", label: "支付流水" },
  { to: "/admin/payments/events", label: "回调 / 事件" },
  { to: "/admin/payments/reconciliations", label: "对账中心" },
];

export default function PaymentAdminSubnav() {
  const { tText } = useAdminT();
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-[var(--theme-border)] pb-3">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-[var(--theme-price)]/15 text-[var(--theme-price)]"
                : "text-muted-foreground hover:bg-secondary"
            }`
          }
        >
          {tText(tab.label)}
        </NavLink>
      ))}
    </div>
  );
}
