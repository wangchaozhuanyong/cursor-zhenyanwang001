import { Bell, LayoutDashboard, LayoutGrid, Package, ShoppingCart } from "lucide-react";
import { AdminNavTab } from "./AdminSidebarNav";
import type { AdminMobileTabKey } from "./adminNavConfig";

type AdminMobileBottomNavProps = {
  tab: AdminMobileTabKey;
  showDashboard: boolean;
  showProducts: boolean;
  showOrders: boolean;
  showNotifications: boolean;
  labels: {
    mainNav: string;
    home: string;
    products: string;
    orders: string;
    notifications: string;
    more: string;
  };
  onNavigate: (path: string) => void;
  onOpenMore: (trigger: HTMLElement) => void;
};

export default function AdminMobileBottomNav({
  tab,
  showDashboard,
  showProducts,
  showOrders,
  showNotifications,
  labels,
  onNavigate,
  onOpenMore,
}: AdminMobileBottomNavProps) {
  return (
    <nav
      className="safe-area-pb fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--theme-border)] bg-[var(--theme-card)]/95 backdrop-blur-md lg:hidden"
      aria-label={labels.mainNav}
    >
      <div className="flex h-14 w-full items-stretch justify-between px-1 md:mx-auto md:max-w-lg">
        {showDashboard ? (
          <AdminNavTab
            icon={LayoutDashboard}
            label={labels.home}
            active={tab === "dash"}
            onClick={() => onNavigate("/admin")}
          />
        ) : null}
        {showProducts ? (
          <AdminNavTab
            icon={Package}
            label={labels.products}
            active={tab === "products"}
            onClick={() => onNavigate("/admin/products")}
          />
        ) : null}
        {showOrders ? (
          <AdminNavTab
            icon={ShoppingCart}
            label={labels.orders}
            active={tab === "orders"}
            onClick={() => onNavigate("/admin/orders")}
          />
        ) : null}
        {showNotifications ? (
          <AdminNavTab
            icon={Bell}
            label={labels.notifications}
            active={tab === "notifications"}
            onClick={() => onNavigate("/admin/notifications")}
          />
        ) : null}
        <AdminNavTab
          icon={LayoutGrid}
          label={labels.more}
          active={tab === "more"}
          onClick={(event) => onOpenMore(event.currentTarget)}
        />
      </div>
    </nav>
  );
}
