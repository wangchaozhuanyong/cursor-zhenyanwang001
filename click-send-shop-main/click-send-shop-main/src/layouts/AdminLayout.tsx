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
  PlusCircle,
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
} from "lucide-react";
import SkinPickerDialog from "@/components/SkinPickerDialog";
import { isAdminAuthenticated, adminLogout, fetchAdminProfile } from "@/services/admin/accountService";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { canAccessAdminPath, getFirstAllowedAdminPath } from "@/config/adminNavAccess";

type NavPerm = string | { anyOf: string[] };

interface NavChild {
  icon: LucideIcon;
  label: string;
  path: string;
  permission?: NavPerm;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  permission?: NavPerm;
  children?: NavChild[];
}

const navItemsRaw: NavItem[] = [
  { icon: LayoutDashboard, label: "仪表盘", path: "/admin", permission: "dashboard.view" },
  {
    icon: Package,
    label: "商品管理",
    path: "/admin/products",
    permission: "product.view",
    children: [
      { icon: FolderTree, label: "分类管理", path: "/admin/categories", permission: "product.view" },
      { icon: Package, label: "库存管理", path: "/admin/inventory", permission: "inventory.manage" },
      { icon: Tags, label: "标签管理", path: "/admin/tags", permission: "product.view" },
    ],
  },
  {
    icon: ShoppingCart,
    label: "订单管理",
    path: "/admin/orders",
    permission: "order.view",
    children: [
      { icon: ShoppingCart, label: "订单列表", path: "/admin/orders", permission: "order.view" },
      { icon: ClipboardList, label: "未完成结算", path: "/admin/orders/unfinished", permission: "order.view" },
    ],
  },
  {
    icon: CreditCard,
    label: "支付管理",
    path: "/admin/payments/channels",
    permission: "payment.manage",
    children: [
      { icon: CreditCard, label: "渠道配置", path: "/admin/payments/channels", permission: "payment.manage" },
      { icon: ClipboardList, label: "支付流水", path: "/admin/payments/orders", permission: "payment.manage" },
      { icon: ScrollText, label: "Webhook / 事件", path: "/admin/payments/events", permission: "payment.manage" },
      { icon: BarChart3, label: "对账中心", path: "/admin/payments/reconciliations", permission: "payment.manage" },
    ],
  },
  { icon: RotateCcw, label: "售后管理", path: "/admin/returns", permission: "return.view" },
  { icon: MessageSquareMore, label: "评论管理", path: "/admin/reviews", permission: "review.manage" },
  {
    icon: Users,
    label: "用户管理",
    path: "/admin/users",
    permission: "user.view",
    children: [
      { icon: Users, label: "用户列表", path: "/admin/users", permission: "user.view" },
      { icon: Crown, label: "会员等级", path: "/admin/member-levels", permission: "member_level.manage" },
    ],
  },
  {
    icon: Megaphone,
    label: "活动管理",
    path: "/admin/marketing",
    permission: { anyOf: ["activity.manage", "coupon.view", "points.manage", "referral.manage", "invite.view"] },
    children: [
      { icon: LayoutGrid, label: "活动总览", path: "/admin/marketing", permission: { anyOf: ["activity.manage", "coupon.view", "points.manage", "referral.manage", "invite.view"] } },
      { icon: Megaphone, label: "营销活动", path: "/admin/marketing/activities", permission: "activity.manage" },
      { icon: PlusCircle, label: "新建活动", path: "/admin/marketing/activities/new", permission: "activity.manage" },
      { icon: Ticket, label: "优惠券管理", path: "/admin/marketing/coupons", permission: "coupon.view" },
      { icon: ClipboardList, label: "领券记录", path: "/admin/marketing/coupons/records", permission: "coupon.view" },
      { icon: Star, label: "积分管理", path: "/admin/marketing/points", permission: "points.manage" },
      { icon: Gift, label: "返现管理", path: "/admin/marketing/rewards", permission: "referral.manage" },
      { icon: Link2, label: "邀请奖励", path: "/admin/marketing/invites", permission: "invite.view" },
    ],
  },
  { icon: Bell, label: "通知管理", path: "/admin/notifications", permission: "notification.manage" },
  { icon: Image, label: "Banner管理", path: "/admin/banners", permission: "banner.manage" },
  { icon: Megaphone, label: "首页运营", path: "/admin/home-ops", permission: "home_ops.manage" },
  {
    icon: BarChart3,
    label: "数据中心",
    path: "/admin/reports/overview",
    permission: "report.view",
    children: [
      { icon: LayoutDashboard, label: "经营总览", path: "/admin/reports/overview", permission: "report.view" },
      { icon: BarChart3, label: "销售日报", path: "/admin/reports/daily", permission: "report.view" },
      { icon: BarChart3, label: "销售月报", path: "/admin/reports/monthly", permission: "report.view" },
      { icon: Package, label: "商品分析", path: "/admin/reports/products", permission: "report.view" },
      { icon: FolderTree, label: "分类分析", path: "/admin/reports/categories", permission: "report.view" },
      { icon: ShoppingCart, label: "订单分析", path: "/admin/reports/orders", permission: "report.view" },
      { icon: Users, label: "客户分析", path: "/admin/reports/customers", permission: "report.view" },
      { icon: Megaphone, label: "活动分析", path: "/admin/reports/activities", permission: "report.view" },
      { icon: Ticket, label: "优惠券分析", path: "/admin/reports/coupons", permission: "report.view" },
      { icon: Package, label: "库存分析", path: "/admin/reports/inventory", permission: "report.view" },
      { icon: Search, label: "搜索分析", path: "/admin/reports/search", permission: "report.view" },
      { icon: FileText, label: "导出中心", path: "/admin/exports", permission: "report.export" }
    ],
  },
  {
    icon: Settings,
    label: "系统设置",
    path: "/admin/settings/site",
    children: [
      { icon: Settings, label: "站点设置", path: "/admin/settings/site", permission: "settings.manage" },
      { icon: Palette, label: "皮肤/视觉设置", path: "/admin/settings/theme", permission: "settings.manage" },
      { icon: Truck, label: "运费规则", path: "/admin/settings/shipping", permission: "shipping.manage" },
      { icon: UserCog, label: "账号设置", path: "/admin/account", permission: "dashboard.view" },
      { icon: FileText, label: "内容管理", path: "/admin/content", permission: "content.manage" },
      { icon: ScrollText, label: "审计日志", path: "/admin/logs", permission: "audit.view" },
      { icon: Shield, label: "角色权限", path: "/admin/settings/roles", permission: "role.manage" },
      { icon: UserCog, label: "管理员管理", path: "/admin/accounts", permission: "role.manage" },
      { icon: RotateCcw, label: "回收站", path: "/admin/recycle-bin", permission: "recycle_bin.manage" },
    ],
  },
];

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
): NavItem[] {
  const out: NavItem[] = [];
  for (const item of items) {
    if (item.children?.length) {
      const children = item.children.filter((c) => passNavPerm(c.permission, can, canAny));
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
  if (pathname.startsWith("/admin/products") || pathname.startsWith("/admin/categories") || pathname.startsWith("/admin/tags")) {
    return "products";
  }
  if (pathname.startsWith("/admin/orders")) return "orders";
  if (pathname.startsWith("/admin/notifications")) return "notifications";
  return "more";
}

/**
 * 侧栏滚动策略：
 * - inline：与整页同一文档流，由浏览器主滚动条带动（桌面端 lg+）
 * - overlay：固定高度抽屉内自滚动（移动端全屏菜单，避免菜单溢出屏幕）
 */
function AdminSidebarNav({
  navItems,
  pathname,
  onNavigate,
  onLogout,
  scrollMode,
}: {
  navItems: NavItem[];
  pathname: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  scrollMode: "inline" | "overlay";
}) {
  const listClassName =
    scrollMode === "overlay"
      ? "min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 py-3"
      : "space-y-0.5 px-2 py-3";

  return (
    <nav
      className={`flex touch-manipulation flex-col ${scrollMode === "overlay" ? "h-full max-h-[100dvh] min-h-0 flex-1" : ""}`}
    >
      <div className="safe-area-pt flex shrink-0 items-center gap-2 border-b border-border px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--theme-primary)] text-sm font-bold text-[var(--theme-primary-foreground)]">A</div>
        <span className="font-display text-lg font-bold text-foreground">管理后台</span>
      </div>

      <div className={listClassName}>
        {navItems.map((item) => {
          const active = pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path));
          const childActive = item.children?.some((c) => pathname === c.path || pathname.startsWith(c.path));
          const isExpanded = active || childActive;
          return (
            <div key={item.path}>
              <button
                type="button"
                onClick={() => onNavigate(item.path)}
                className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] transition-colors active:bg-secondary/80 ${
                  active || childActive
                    ? "bg-[var(--theme-primary)] font-semibold text-[var(--theme-primary-foreground)]"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon size={20} strokeWidth={2} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.children && (
                  <ChevronRight size={18} className={`shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                )}
              </button>
              <AnimatePresence initial={false}>
                {item.children && isExpanded ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="ml-4 mt-0.5 overflow-hidden space-y-0.5 border-l border-border pl-3"
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
          退出登录
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

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [topSearch, setTopSearch] = useState("");
  const avatarRef = useRef<HTMLDivElement>(null);

  const can = useAdminPermissionStore((s) => s.can);
  const canAny = useAdminPermissionStore((s) => s.canAny);

  const navItems = useMemo(
    () => filterNav(navItemsRaw, can, canAny),
    [can, canAny],
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
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }

  const currentNav = navItems.find(
    (n) => location.pathname === n.path || (n.path !== "/admin" && location.pathname.startsWith(n.path)),
  );

  const tab = mobileBottomTab(location.pathname);

  const showNotifTab = can("notification.manage");

  return (
    <div className="flex min-h-[100dvh] items-start bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <aside className="hidden w-[260px] shrink-0 border-r border-[var(--theme-border)] bg-[var(--theme-card)] lg:block">
        <AdminSidebarNav
          scrollMode="inline"
          navItems={navItems}
          pathname={location.pathname}
          onNavigate={handleSidebarNavigate}
          onLogout={handleSidebarLogout}
        />
      </aside>

      <AnimatePresence>
        {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.button
            type="button"
            aria-label="关闭菜单"
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
            />
          </motion.aside>
        </div>
        ) : null}
      </AnimatePresence>

      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
        <header className="safe-area-pt sticky top-0 z-30 flex flex-col border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md">
          <div className="flex min-h-[48px] items-center gap-2 px-3 py-2 sm:px-4 lg:px-6">
            <button
              type="button"
              aria-label="打开菜单"
              className="touch-manipulation flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-foreground hover:bg-secondary lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h2 className="min-w-0 truncate text-sm font-semibold text-foreground sm:text-base">
              {currentNav?.label ?? "管理后台"}
            </h2>
            <div className="flex-1" />
            <div className="hidden items-center gap-2 rounded-xl bg-secondary px-3 py-2 md:flex">
              <Search size={16} className="shrink-0 text-muted-foreground" />
              <input
                placeholder="搜索菜单..."
                value={topSearch}
                onChange={(e) => setTopSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTopSearch()}
                className="w-36 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground lg:w-40"
              />
            </div>
            {showNotifTab && (
              <button
                type="button"
                aria-label="通知"
                className="touch-manipulation relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary"
                onClick={() => navigate("/admin/notifications")}
              >
                <Bell size={20} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
              </button>
            )}
            <SkinPickerDialog
              title="切换系统皮肤"
              trigger={(
                <button
                  type="button"
                  aria-label="切换皮肤"
                  className="touch-manipulation flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary"
                >
                  <Palette size={19} />
                </button>
              )}
            />
            <div ref={avatarRef} className="relative shrink-0">
              <button
                type="button"
                aria-label="账号"
                className="touch-manipulation flex h-11 min-w-[44px] items-center gap-1 rounded-xl px-1 hover:bg-secondary"
                onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--theme-primary)] text-xs font-bold text-[var(--theme-primary-foreground)]">A</div>
                <ChevronDown size={14} className={`hidden text-muted-foreground transition-transform sm:block ${avatarMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {avatarMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border bg-card py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => { navigate("/admin/account"); setAvatarMenuOpen(false); }}
                    className="flex min-h-[44px] w-full items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-secondary"
                  >
                    <User size={16} /> 账号设置
                  </button>
                  <div className="mx-3 my-1 h-px bg-border" />
                  <button
                    type="button"
                    onClick={() => { adminLogout(); navigate("/admin/login"); setAvatarMenuOpen(false); }}
                    className="flex min-h-[44px] w-full items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-secondary"
                  >
                    <LogOut size={16} /> 退出登录
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border px-3 py-2 md:hidden">
            <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
              <Search size={16} className="shrink-0 text-muted-foreground" />
              <input
                placeholder="搜索菜单..."
                value={topSearch}
                onChange={(e) => setTopSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTopSearch()}
                className="min-h-[40px] flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </header>

        <main className="admin-mobile-main flex-1 p-3 sm:p-4 lg:p-6">
          <Suspense fallback={<AdminOutletFallback />}>
            <AnimatedPage>
              <Outlet />
            </AnimatedPage>
          </Suspense>
        </main>

        <nav
          className="safe-area-pb fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--theme-border)] bg-[var(--theme-card)]/95 backdrop-blur-md lg:hidden"
          aria-label="主导航"
        >
          <div className="flex h-14 max-w-lg mx-auto items-stretch justify-between px-1">
            <AdminNavTab
              icon={LayoutDashboard}
              label="首页"
              active={tab === "dash"}
              onClick={() => navigate("/admin")}
            />
            <AdminNavTab
              icon={Package}
              label="商品"
              active={tab === "products"}
              onClick={() => navigate("/admin/products")}
            />
            <AdminNavTab
              icon={ShoppingCart}
              label="订单"
              active={tab === "orders"}
              onClick={() => navigate("/admin/orders")}
            />
            {showNotifTab ? (
              <AdminNavTab
                icon={Bell}
                label="通知"
                active={tab === "notifications"}
                onClick={() => navigate("/admin/notifications")}
              />
            ) : null}
            <AdminNavTab
              icon={LayoutGrid}
              label="更多"
              active={tab === "more"}
              onClick={() => setSidebarOpen(true)}
            />
          </div>
        </nav>
      </div>
    </div>
  );
}



