import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedPage } from "@/modules/micro-interactions";
import { Outlet, useNavigate, useLocation, Navigate } from "react-router-dom";
import { AdminOutletFallback } from "@/components/AppRouteFallback";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Link2,
  Star,
  Ticket,
  Settings,
  LogOut,
  Menu,
  Bell,
  Megaphone,
  Search,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Tags,
  ClipboardList,
  Gift,
  RotateCcw,
  Image,
  BarChart3,
  FileText,
  ScrollText,
  Truck,
  UserCog,
  User,
  LayoutGrid,
  Shield,
  MessageSquareMore,
  Palette,
  CreditCard,
  Crown,
  Languages,
  Lock,
  Paintbrush,
  MousePointerClick,
  Headphones,
  AlertTriangle,
} from "lucide-react";
import AdminAccountSettingsDialog from "@/components/admin/AdminAccountSettingsDialog";
import type { AdminAccountTab } from "@/components/admin/AdminAccountPanel";
import { getHiddenAdminHeaderTitle, resolveAdminHeaderTitle } from "@/config/adminNavTitle";
import SkinPickerDialog from "@/components/SkinPickerDialog";
import { useAdminT } from "@/hooks/useAdminT";
import type { AdminLocale } from "@/i18n/admin";
import { isAdminAuthenticated, adminLogout, fetchAdminProfile } from "@/services/admin/accountService";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { canAccessAdminPath, getFirstAllowedAdminPath } from "@/config/adminNavAccess";
import { AdminConfirmProvider } from "@/modules/admin/context/AdminConfirmContext";
import AdminSiteLogo from "@/components/admin/AdminSiteLogo";
import AdminOrderVoiceNotifier from "@/modules/admin/components/AdminOrderVoiceNotifier";
import AdminEventBell from "@/modules/admin/components/AdminEventBell";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import type { SiteCapabilities } from "@/types/siteCapabilities";
import { useAdminEvents } from "@/hooks/admin/useAdminEvents";
import { getSecurityAlerts, type SecurityAlertSummary } from "@/api/admin/audit";

type NavPerm = string | { anyOf: string[] };

interface NavChild {
  icon: LucideIcon;
  labelKey: string;
  path: string;
  permission?: NavPerm;
}

interface NavItem {
  icon: LucideIcon;
  labelKey: string;
  path: string;
  permission?: NavPerm;
  children?: NavChild[];
}

type ResolvedNavChild = NavChild & { label: string };
type ResolvedNavItem = Omit<NavItem, "children"> & { label: string; children?: ResolvedNavChild[] };

const localNavLabels: Record<string, string> = {
  "nav.monitoringCenter": "监控中心",
  "nav.monitoringOverview": "数据总览",
  "nav.monitoringAnomalies": "数据异常",
  "nav.monitoringRepairTasks": "修复任务",
  "nav.monitoringRules": "监控规则",
  "nav.monitoringRuns": "运行记录",
};

function resolveNavLabel(t: (key: string) => string, key: string) {
  const translated = t(key);
  return translated === key ? localNavLabels[key] || key : translated;
}

const navItemsRaw: NavItem[] = [
  { icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/admin", permission: "dashboard.view" },
  {
    icon: Package,
    labelKey: "nav.productCenter",
    path: "/admin/products",
    permission: "product.view",
    children: [
      { icon: Package, labelKey: "nav.productManage", path: "/admin/products", permission: "product.view" },
      { icon: FolderTree, labelKey: "nav.categories", path: "/admin/categories", permission: "product.view" },
      { icon: Package, labelKey: "nav.inventory", path: "/admin/inventory", permission: "inventory.manage" },
      { icon: Tags, labelKey: "nav.tags", path: "/admin/tags", permission: "product.view" },
    ],
  },
  {
    icon: ShoppingCart,
    labelKey: "nav.orderCenter",
    path: "/admin/orders",
    permission: "order.view",
    children: [
      { icon: ShoppingCart, labelKey: "nav.orderManage", path: "/admin/orders", permission: "order.view" },
      { icon: ClipboardList, labelKey: "nav.unfinishedCheckout", path: "/admin/orders/unfinished", permission: "order.view" },
    ],
  },
  {
    icon: CreditCard,
    labelKey: "nav.paymentCenter",
    path: "/admin/payments/channels",
    permission: "payment.manage",
    children: [
      { icon: CreditCard, labelKey: "nav.paymentChannels", path: "/admin/payments/channels", permission: "payment.manage" },
      { icon: ClipboardList, labelKey: "nav.paymentOrders", path: "/admin/payments/orders", permission: "payment.manage" },
      { icon: ScrollText, labelKey: "nav.paymentEvents", path: "/admin/payments/events", permission: "payment.manage" },
      { icon: BarChart3, labelKey: "nav.paymentReconciliations", path: "/admin/payments/reconciliations", permission: "payment.manage" },
    ],
  },
  {
    icon: RotateCcw,
    labelKey: "nav.afterSaleCenter",
    path: "/admin/returns",
    permission: "return.view",
    children: [
      { icon: RotateCcw, labelKey: "nav.returns", path: "/admin/returns", permission: "return.view" },
    ],
  },
  {
    icon: Users,
    labelKey: "nav.customerCenter",
    path: "/admin/users",
    permission: { anyOf: ["user.view", "member_level.manage", "review.view", "review.manage"] },
    children: [
      { icon: Users, labelKey: "nav.userManage", path: "/admin/users", permission: "user.view" },
      { icon: Crown, labelKey: "nav.memberLevels", path: "/admin/member-levels", permission: "member_level.manage" },
      { icon: MessageSquareMore, labelKey: "nav.reviews", path: "/admin/reviews", permission: { anyOf: ["review.view", "review.manage"] } },
    ],
  },
  {
    icon: Megaphone,
    labelKey: "nav.marketingCenter",
    path: "/admin/marketing",
    permission: { anyOf: ["activity.manage", "coupon.view", "points.manage", "referral.manage", "invite.view"] },
    children: [
      { icon: LayoutGrid, labelKey: "nav.marketingOverview", path: "/admin/marketing", permission: { anyOf: ["activity.manage", "coupon.view", "points.manage", "referral.manage", "invite.view"] } },
      { icon: Megaphone, labelKey: "nav.activities", path: "/admin/marketing/activities", permission: "activity.manage" },
      { icon: Ticket, labelKey: "nav.coupons", path: "/admin/marketing/coupons", permission: "coupon.view" },
      { icon: ClipboardList, labelKey: "nav.couponRecords", path: "/admin/marketing/coupons/records", permission: "coupon.view" },
      { icon: Star, labelKey: "nav.points", path: "/admin/marketing/points", permission: "points.manage" },
      { icon: Gift, labelKey: "nav.rewards", path: "/admin/marketing/rewards", permission: "referral.manage" },
      { icon: Link2, labelKey: "nav.invites", path: "/admin/marketing/invites", permission: "invite.view" },
    ],
  },
  {
    icon: Paintbrush,
    labelKey: "nav.designCenter",
    path: "/admin/home-ops",
    permission: { anyOf: ["home_ops.manage", "banner.manage", "settings.manage", "content.manage"] },
    children: [
      { icon: LayoutGrid, labelKey: "nav.homeDesign", path: "/admin/home-ops", permission: "home_ops.manage" },
      { icon: Image, labelKey: "nav.banners", path: "/admin/banners", permission: "banner.manage" },
      { icon: Headphones, labelKey: "nav.supportDownload", path: "/admin/support-download", permission: "settings.manage" },
      { icon: Palette, labelKey: "nav.themeSettings", path: "/admin/settings/theme", permission: "settings.manage" },
      { icon: FileText, labelKey: "nav.content", path: "/admin/content", permission: "content.manage" },
    ],
  },
  {
    icon: Bell,
    labelKey: "nav.notificationCenter",
    path: "/admin/notifications",
    permission: { anyOf: ["notification.view", "notification.manage"] },
    children: [
      { icon: Bell, labelKey: "nav.notifications", path: "/admin/notifications", permission: { anyOf: ["notification.view", "notification.manage"] } },
    ],
  },
  {
    icon: Shield,
    labelKey: "nav.monitoringCenter",
    path: "/admin/monitoring",
    permission: { anyOf: ["monitoring.view", "monitoring.manage", "monitoring.repair"] },
    children: [
      { icon: LayoutDashboard, labelKey: "nav.monitoringOverview", path: "/admin/monitoring", permission: { anyOf: ["monitoring.view", "monitoring.manage", "monitoring.repair"] } },
      { icon: Shield, labelKey: "nav.monitoringAnomalies", path: "/admin/monitoring/anomalies", permission: { anyOf: ["monitoring.view", "monitoring.manage", "monitoring.repair"] } },
      { icon: RotateCcw, labelKey: "nav.monitoringRepairTasks", path: "/admin/monitoring/repair-tasks", permission: { anyOf: ["monitoring.view", "monitoring.manage", "monitoring.repair"] } },
      { icon: Settings, labelKey: "nav.monitoringRules", path: "/admin/monitoring/rules", permission: { anyOf: ["monitoring.view", "monitoring.manage"] } },
      { icon: ScrollText, labelKey: "nav.monitoringRuns", path: "/admin/monitoring/runs", permission: { anyOf: ["monitoring.view", "monitoring.manage", "monitoring.repair"] } },
    ],
  },
  {
    icon: BarChart3,
    labelKey: "nav.dataCenter",
    path: "/admin/reports/overview",
    permission: "report.view",
    children: [
      { icon: LayoutDashboard, labelKey: "nav.reportOverview", path: "/admin/reports/overview", permission: "report.view" },
      { icon: BarChart3, labelKey: "nav.reportDaily", path: "/admin/reports/daily", permission: "report.view" },
      { icon: BarChart3, labelKey: "nav.reportMonthly", path: "/admin/reports/monthly", permission: "report.view" },
      { icon: BarChart3, labelKey: "nav.reportProfit", path: "/admin/reports/profit", permission: "report.view" },
      { icon: ClipboardList, labelKey: "nav.reportExpenses", path: "/admin/reports/expenses", permission: "report.view" },
      { icon: Package, labelKey: "nav.reportProducts", path: "/admin/reports/products", permission: "report.view" },
      { icon: FolderTree, labelKey: "nav.reportCategories", path: "/admin/reports/categories", permission: "report.view" },
      { icon: ShoppingCart, labelKey: "nav.reportOrders", path: "/admin/reports/orders", permission: "report.view" },
      { icon: Users, labelKey: "nav.reportCustomers", path: "/admin/reports/customers", permission: "report.view" },
      { icon: Megaphone, labelKey: "nav.reportActivities", path: "/admin/reports/activities", permission: "report.view" },
      { icon: Ticket, labelKey: "nav.reportCoupons", path: "/admin/reports/coupons", permission: "report.view" },
      { icon: Package, labelKey: "nav.reportInventory", path: "/admin/reports/inventory", permission: "report.view" },
      { icon: Search, labelKey: "nav.reportSearch", path: "/admin/reports/search", permission: "report.view" },
      { icon: MousePointerClick, labelKey: "nav.reportTraffic", path: "/admin/reports/traffic", permission: "report.view" },
      { icon: FileText, labelKey: "nav.exports", path: "/admin/exports", permission: "report.export" },
    ],
  },
  {
    icon: UserCog,
    labelKey: "nav.staffCenter",
    path: "/admin/accounts",
    permission: "role.manage",
    children: [
      { icon: UserCog, labelKey: "nav.staffAccounts", path: "/admin/accounts", permission: "role.manage" },
      { icon: Shield, labelKey: "nav.roles", path: "/admin/settings/roles", permission: "role.manage" },
    ],
  },
  {
    icon: Settings,
    labelKey: "nav.settings",
    path: "/admin/settings/site",
    children: [
      { icon: Settings, labelKey: "nav.siteSettings", path: "/admin/settings/site", permission: "settings.manage" },
      { icon: Settings, labelKey: "nav.featureSettings", path: "/admin/settings/features", permission: "settings.manage" },
      { icon: Bell, labelKey: "nav.telegramNotifications", path: "/admin/settings/telegram", permission: "settings.manage" },
      { icon: Truck, labelKey: "nav.shipping", path: "/admin/settings/shipping", permission: "shipping.manage" },
      { icon: ScrollText, labelKey: "nav.auditLogs", path: "/admin/logs", permission: "audit.view" },
      { icon: RotateCcw, labelKey: "nav.recycleBin", path: "/admin/recycle-bin", permission: "recycle_bin.manage" },
    ],
  },
];

function resolveNavLabels(items: NavItem[], t: (key: string) => string): ResolvedNavItem[] {
  return items.map((item) => ({
    ...item,
    label: resolveNavLabel(t, item.labelKey),
    children: item.children?.map((c) => ({ ...c, label: resolveNavLabel(t, c.labelKey) })),
  }));
}

function passNavPerm(
  p: NavPerm | undefined,
  can: (c: string) => boolean,
  canAny: (a: string[]) => boolean,
): boolean {
  if (p === undefined) return true;
  if (typeof p === "string") return can(p);
  return canAny(p.anyOf);
}

function filterNav(
  items: NavItem[],
  can: (c: string) => boolean,
  canAny: (a: string[]) => boolean,
  capabilities: SiteCapabilities,
): NavItem[] {
  const hiddenByCapability = (path?: string) => {
    if (!path) return false;
    if (path.includes("/payments/")) return !capabilities.onlinePaymentEnabled;
    if (path.includes("/marketing/coupons") || path.includes("/reports/coupons")) return !capabilities.couponEnabled;
    if (path.includes("/marketing/points")) return !capabilities.pointsEnabled;
    if (path.includes("/member-levels")) return !capabilities.memberLevelEnabled;
    if (path.includes("/reviews")) return !capabilities.reviewEnabled;
    if (path.includes("/inventory") || path.includes("/reports/inventory")) return !capabilities.inventoryEnabled;
    if (path.includes("/settings/shipping")) return !capabilities.shippingEnabled;
    if (path.includes("/support-download")) return !capabilities.customerServiceDownloadEnabled;
    if (path.includes("/reports/traffic")) return !capabilities.trafficAnalyticsEnabled;
    return false;
  };
  const out: NavItem[] = [];
  for (const item of items) {
    if (hiddenByCapability(item.path)) continue;
    if (item.children?.length) {
      const children = item.children.filter((c) => !hiddenByCapability(c.path) && passNavPerm(c.permission, can, canAny));
      if (children.length === 0) continue;
      if (item.permission !== undefined && !passNavPerm(item.permission, can, canAny)) continue;
      out.push({ ...item, children });
      continue;
    }
    if (!passNavPerm(item.permission, can, canAny)) continue;
    out.push(item);
  }
  return out;
}

/** 底部主导航四入口 +「更多」侧栏，与移动端拇指热区一致 */
function mobileBottomTab(pathname: string): "dash" | "products" | "orders" | "notifications" | "more" {
  if (pathname === "/admin" || pathname === "/admin/") return "dash";
  if (
    pathname.startsWith("/admin/products") ||
    pathname.startsWith("/admin/categories") ||
    pathname.startsWith("/admin/tags") ||
    pathname.startsWith("/admin/inventory")
  ) {
    return "products";
  }
  if (pathname.startsWith("/admin/orders")) return "orders";
  if (pathname.startsWith("/admin/notifications")) return "notifications";
  return "more";
}

/**
 * 侧栏滚动策略：
 * - inline：桌面端 sticky 满高侧栏，菜单区内部滚动，退出固定在底部（避免侧栏下方留白不跟滚）
 * - overlay：固定高度抽屉内自滚动（移动端全屏菜单，避免菜单溢出屏幕）
 */
function AdminSidebarNav({
  navItems,
  pathname,
  onNavigate,
  onLogout,
  scrollMode,
  layoutTitle,
  logoutLabel,
}: {
  navItems: ResolvedNavItem[];
  pathname: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  scrollMode: "inline" | "overlay";
  layoutTitle: string;
  logoutLabel: string;
}) {
  const [expandedPath, setExpandedPath] = useState<string | null>(null);

  useEffect(() => {
    const activeGroup = navItems.find((item) => {
      if (!item.children?.length) return false;
      const active = pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path));
      const childActive = item.children.some((c) => pathname === c.path || pathname.startsWith(c.path));
      return active || childActive;
    });
    if (activeGroup) setExpandedPath(activeGroup.path);
  }, [navItems, pathname]);

  const listClassName =
    scrollMode === "overlay"
      ? "min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 py-3"
      : "min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 py-3";

  return (
    <nav
      className={`flex touch-manipulation flex-col ${
        scrollMode === "overlay" ? "h-full max-h-[100dvh] min-h-0 flex-1" : "h-full min-h-0"
      }`}
    >
      <div className="safe-area-pt flex shrink-0 items-center gap-2 border-b border-border px-5 py-4">
        <AdminSiteLogo size="sm" />
        <span className="min-w-0 truncate font-display text-lg font-bold text-foreground">{layoutTitle}</span>
      </div>

      <div className={listClassName}>
        {navItems.map((item) => {
          const active = pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path));
          const childActive = item.children?.some((c) => pathname === c.path || pathname.startsWith(c.path));
          const isExpanded = expandedPath === item.path;
          return (
            <div key={item.path}>
              <button
                type="button"
                onClick={() => {
                  if (item.children?.length) {
                    setExpandedPath((prev) => (prev === item.path ? null : item.path));
                    return;
                  }
                  onNavigate(item.path);
                }}
                className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] transition-colors active:bg-secondary/80 ${
                  active || childActive
                    ? "bg-[var(--theme-primary)] font-semibold text-[var(--theme-primary-foreground)]"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon size={20} strokeWidth={2} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.children && <ChevronRight size={18} className={`shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />}
              </button>
              <AnimatePresence initial={false}>
                {item.children && isExpanded ? (
                <motion.div
                  layout
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="relative z-0 ml-4 mt-0.5 overflow-hidden space-y-0.5 border-l border-border pl-3"
                >
                  {item.children.map((child) => {
                    const cActive = child.path === item.path
                      ? pathname === child.path
                      : pathname === child.path || pathname.startsWith(child.path);
                    return (
                      <button
                        type="button"
                        key={child.path}
                        onClick={() => onNavigate(child.path)}
                        className={`flex min-h-[44px] w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-sm transition-colors active:bg-secondary/80 ${
                          cActive ? "font-semibold text-[var(--theme-primary)]" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <child.icon size={18} />
                        {child.label}
                      </button>
                    );
                  })}
                </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="safe-area-pb shrink-0 border-t border-border px-2 py-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-muted-foreground hover:bg-secondary active:bg-secondary/80"
        >
          <LogOut size={20} />
          {logoutLabel}
        </button>
      </div>
    </nav>
  );
}

function AdminNavTab({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`touch-manipulation flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 active:opacity-80 ${
        active ? "text-[var(--theme-primary)]" : "text-muted-foreground"
      }`}
    >
      <Icon size={22} strokeWidth={active ? 2.25 : 2} className="shrink-0" />
      <span className="max-w-full truncate text-[10px] font-medium leading-tight">{label}</span>
    </button>
  );
}

function AdminLayoutContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, locale, setLocale } = useAdminT();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [skinPickerOpen, setSkinPickerOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountDialogTab, setAccountDialogTab] = useState<AdminAccountTab>("profile");
  const [topSearch, setTopSearch] = useState("");
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlertSummary | null>(null);
  const [securityAlertsOpen, setSecurityAlertsOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const securityAlertsRef = useRef<HTMLDivElement>(null);

  const can = useAdminPermissionStore((s) => s.can);
  const canAny = useAdminPermissionStore((s) => s.canAny);
  const isSuperAdmin = useAdminPermissionStore((s) => s.isSuperAdmin);
  const capabilities = useSiteCapabilities();
  useAdminEvents(true);
  const canViewSecurityAlerts = isSuperAdmin || can("audit.view");

  const navItems = useMemo(
    () => resolveNavLabels(filterNav(navItemsRaw, can, canAny, capabilities), t),
    [can, canAny, capabilities, t],
  );

  useEffect(() => {
    if (!isAdminAuthenticated()) return;
    fetchAdminProfile().catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAdminAuthenticated()) return;
    const path = location.pathname;
    if (!canAccessAdminPath(path, can, canAny)) {
      navigate(getFirstAllowedAdminPath(can), { replace: true });
    }
  }, [location.pathname, can, canAny, navigate]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (skinPickerOpen) return;
      if (target.closest('[role="dialog"]')) return;
      if (avatarRef.current && !avatarRef.current.contains(target)) {
        setAvatarMenuOpen(false);
      }
      if (securityAlertsRef.current && !securityAlertsRef.current.contains(target)) {
        setSecurityAlertsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [skinPickerOpen]);

  useEffect(() => {
    if (!isAdminAuthenticated() || !canViewSecurityAlerts) {
      setSecurityAlerts(null);
      return;
    }

    let alive = true;
    const load = async () => {
      try {
        const data = await getSecurityAlerts({ limit: 5, sinceHours: 24 });
        if (alive) setSecurityAlerts(data);
      } catch {
        if (alive) setSecurityAlerts(null);
      }
    };

    void load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [canViewSecurityAlerts]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleTopSearch = () => {
    const q = topSearch.trim();
    if (!q) return;
    const lq = q.toLowerCase();
    const match = navItems.find(
      (n) => n.label.includes(lq) || n.children?.some((c) => c.label.includes(lq)),
    );
    if (match) {
      const child = match.children?.find((c) => c.label.includes(lq));
      navigate(child?.path ?? match.path);
    }
    setTopSearch("");
  };

  const handleSidebarNavigate = useCallback(
    (path: string) => {
      navigate(path);
      setSidebarOpen(false);
    },
    [navigate],
  );

  const handleSidebarLogout = useCallback(() => {
    adminLogout();
    navigate("/admin/login");
  }, [navigate]);

  const headerTitle = useMemo(() => {
    const hidden = getHiddenAdminHeaderTitle(location.pathname, t);
    if (hidden) return hidden;
    return resolveAdminHeaderTitle(navItems, location.pathname, t("layout.title"));
  }, [navItems, location.pathname, t]);

  const openAccountDialog = useCallback((tab: AdminAccountTab) => {
    setAccountDialogTab(tab);
    setAccountDialogOpen(true);
    setAvatarMenuOpen(false);
  }, []);

  const tab = mobileBottomTab(location.pathname);

  const showNotifTab = can("notification.manage") || can("notification.view");
  const securityAlertCount = securityAlerts?.total ?? 0;

  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <AdminConfirmProvider>
    <div data-admin-shell className="flex min-h-[100dvh] items-start bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <aside className="hidden w-[260px] shrink-0 self-start border-r border-[var(--theme-border)] bg-[var(--theme-card)] lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:max-h-[100dvh] lg:flex-col">
        <AdminSidebarNav
          scrollMode="inline"
          navItems={navItems}
          pathname={location.pathname}
          onNavigate={handleSidebarNavigate}
          onLogout={handleSidebarLogout}
          layoutTitle={t("layout.title")}
          logoutLabel={t("layout.logout")}
        />
      </aside>

      <AnimatePresence>
        {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.button
            type="button"
            aria-label={t("layout.closeMenu")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setSidebarOpen(false)}
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="safe-area-pl absolute left-0 top-0 flex h-full w-[min(88vw,20rem)] max-w-sm flex-col overflow-hidden bg-[var(--theme-card)] shadow-2xl"
          >
            <AdminSidebarNav
              scrollMode="overlay"
              navItems={navItems}
              pathname={location.pathname}
              onNavigate={handleSidebarNavigate}
              onLogout={handleSidebarLogout}
              layoutTitle={t("layout.title")}
              logoutLabel={t("layout.logout")}
            />
          </motion.aside>
        </div>
        ) : null}
      </AnimatePresence>

      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
        <header className="safe-area-pt sticky top-0 z-30 flex flex-col border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md">
          <div className="flex min-h-[48px] items-center gap-2 px-[var(--admin-mobile-page-x)] py-2 sm:px-4 lg:px-6">
            <button
              type="button"
              aria-label={t("layout.openMenu")}
              className="touch-manipulation flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-foreground hover:bg-secondary lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h2 className="min-w-0 truncate text-sm font-semibold text-foreground sm:text-base">
              {headerTitle}
            </h2>
            <div className="flex-1" />
            <div className="hidden items-center gap-2 rounded-xl bg-secondary px-3 py-2 md:flex">
              <Search size={16} className="shrink-0 text-muted-foreground" />
              <input
                placeholder={t("layout.searchMenu")}
                value={topSearch}
                onChange={(e) => setTopSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTopSearch()}
                className="w-36 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground lg:w-40"
              />
            </div>
            <AdminEventBell />
            {false && (showNotifTab || canViewSecurityAlerts) && (
              <div ref={securityAlertsRef} className="relative shrink-0">
                <button
                  type="button"
                  aria-label={t("layout.notifications")}
                  className="touch-manipulation relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary"
                  onClick={() => {
                    if (canViewSecurityAlerts) {
                      setSecurityAlertsOpen((v) => !v);
                      return;
                    }
                    navigate("/admin/notifications");
                  }}
                >
                  <Bell size={20} />
                  {securityAlertCount > 0 ? (
                    <span className="absolute right-1.5 top-1.5 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white">
                      {securityAlertCount > 99 ? "99+" : securityAlertCount}
                    </span>
                  ) : showNotifTab ? (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
                  ) : null}
                </button>
                {securityAlertsOpen && canViewSecurityAlerts ? (
                  <motion.div className="absolute right-0 top-full z-50 mt-1 w-[min(92vw,22rem)] rounded-xl border border-border bg-card p-2 shadow-lg">
                    <div className="flex items-center justify-between px-2 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Shield size={16} className="shrink-0 text-destructive" />
                        <p className="truncate text-sm font-semibold text-foreground">安全监控</p>
                      </div>
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                        onClick={() => {
                          setSecurityAlertsOpen(false);
                          navigate("/admin/logs?keyword=security");
                        }}
                      >
                        审计日志
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {securityAlerts?.list?.length ? (
                        securityAlerts.list.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="flex w-full gap-2 rounded-lg px-2 py-2 text-left hover:bg-secondary"
                            onClick={() => {
                              setSecurityAlertsOpen(false);
                              navigate(`/admin/logs?actionType=${encodeURIComponent(item.action_type)}`);
                            }}
                          >
                            <AlertTriangle size={15} className={`mt-0.5 shrink-0 ${item.result === "failure" ? "text-destructive" : "text-[var(--theme-primary)]"}`} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium text-foreground">{item.summary || item.action_type}</span>
                              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{item.ip || "-"} · {new Date(item.created_at).toLocaleString()}</span>
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-2 py-6 text-center text-xs text-muted-foreground">近 24 小时暂无安全告警</div>
                      )}
                    </div>
                    {showNotifTab ? (
                      <button
                        type="button"
                        className="mt-1 flex min-h-[40px] w-full items-center justify-center rounded-lg border border-border text-sm text-foreground hover:bg-secondary"
                        onClick={() => {
                          setSecurityAlertsOpen(false);
                          navigate("/admin/notifications");
                        }}
                      >
                        打开通知中心
                      </button>
                    ) : null}
                  </motion.div>
                ) : null}
              </div>
            )}
            {can("order.view") && <AdminOrderVoiceNotifier />}
            <div ref={avatarRef} className="relative shrink-0">
              <button
                type="button"
                aria-label={t("layout.account")}
                className="touch-manipulation flex h-11 min-w-[44px] items-center gap-1 rounded-xl px-1 hover:bg-secondary"
                onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--theme-primary)] text-xs font-bold text-[var(--theme-primary-foreground)]">A</div>
                <ChevronDown size={14} className={`hidden text-muted-foreground transition-transform sm:block ${avatarMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {avatarMenuOpen && (
                <motion.div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-card py-1 shadow-lg">
                  <button
                    type="button"
                    className="flex min-h-[44px] w-full items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-secondary"
                    onClick={() => {
                      setSkinPickerOpen(true);
                      setAvatarMenuOpen(false);
                    }}
                  >
                    <Palette size={16} />
                    {t("layout.changeSkin")}
                  </button>
                  <div className="px-4 py-2">
                    <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Languages size={14} />
                      {t("layout.language")}
                    </p>
                    <div className="flex gap-2">
                      {(["zh", "en"] as AdminLocale[]).map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => { setLocale(loc); setAvatarMenuOpen(false); }}
                          className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                            locale === loc
                              ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
                              : "bg-secondary text-foreground hover:opacity-90"
                          }`}
                        >
                          {loc === "zh" ? t("layout.languageZh") : t("layout.languageEn")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mx-3 my-1 h-px bg-border" />
                  <button
                    type="button"
                    onClick={() => openAccountDialog("profile")}
                    className="flex min-h-[44px] w-full items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-secondary"
                  >
                    <User size={16} />
                    {t("layout.accountSettings")}
                  </button>
                  <button
                    type="button"
                    onClick={() => openAccountDialog("password")}
                    className="flex min-h-[44px] w-full items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-secondary"
                  >
                    <Lock size={16} />
                    {t("layout.changePassword")}
                  </button>
                  <div className="mx-3 my-1 h-px bg-border" />
                  <button
                    type="button"
                    onClick={() => { adminLogout(); navigate("/admin/login"); setAvatarMenuOpen(false); }}
                    className="flex min-h-[44px] w-full items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-secondary"
                  >
                    <LogOut size={16} />
                    {t("layout.logout")}
                  </button>
                </motion.div>
              )}
            </div>
          </div>

          <div className="border-t border-border px-3 py-2 md:hidden">
            <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
              <Search size={16} className="shrink-0 text-muted-foreground" />
              <input
                placeholder={t("layout.searchMenu")}
                value={topSearch}
                onChange={(e) => setTopSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTopSearch()}
                className="min-h-[40px] flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </header>

        <main className="admin-mobile-main admin-table-scope flex-1 p-[var(--admin-mobile-page-x)] sm:p-4 lg:p-6">
          <Suspense fallback={<AdminOutletFallback />}>
            <AnimatedPage>
              <Outlet />
            </AnimatedPage>
          </Suspense>
        </main>

        <nav
          className="safe-area-pb fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--theme-border)] bg-[var(--theme-card)]/95 backdrop-blur-md lg:hidden"
          aria-label={t("layout.mainNav")}
        >
          <div className="flex h-14 w-full items-stretch justify-between px-1 md:mx-auto md:max-w-lg">
            <AdminNavTab
              icon={LayoutDashboard}
              label={t("layout.mobileHome")}
              active={tab === "dash"}
              onClick={() => navigate("/admin")}
            />
            <AdminNavTab
              icon={Package}
              label={t("layout.mobileProducts")}
              active={tab === "products"}
              onClick={() => navigate("/admin/products")}
            />
            <AdminNavTab
              icon={ShoppingCart}
              label={t("layout.mobileOrders")}
              active={tab === "orders"}
              onClick={() => navigate("/admin/orders")}
            />
            {showNotifTab ? (
              <AdminNavTab
                icon={Bell}
                label={t("layout.mobileNotifications")}
                active={tab === "notifications"}
                onClick={() => navigate("/admin/notifications")}
              />
            ) : null}
            <AdminNavTab
              icon={LayoutGrid}
              label={t("layout.mobileMore")}
              active={tab === "more"}
              onClick={() => setSidebarOpen(true)}
            />
          </div>
        </nav>
      </div>
      <SkinPickerDialog
        open={skinPickerOpen}
        onOpenChange={setSkinPickerOpen}
        title={t("skin.titleSystem")}
        description={t("skin.description")}
        loadingText={t("skin.loading")}
        currentSkinHint={t("skin.currentSkin")}
        switchHint={t("skin.switchHint")}
        selectedBadge={t("skin.selected")}
      />
      <AdminAccountSettingsDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        initialTab={accountDialogTab}
      />
    </div>
    </AdminConfirmProvider>
  );
}

export default AdminLayoutContent;
