import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/admin/payments/channels", label: "渠道配置" },
  { to: "/admin/payments/orders", label: "支付流水" },
  { to: "/admin/payments/events", label: "Webhook / 事件" },
  { to: "/admin/payments/reconciliations", label: "对账中心" },
];

export default function PaymentAdminSubnav() {
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-[var(--theme-border)] pb-3">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-[var(--theme-price)]/15 text-[var(--theme-price)]"
                : "text-muted-foreground hover:bg-secondary"
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}
