import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AdminOutletFallback } from "@/components/AppRouteFallback";
import { DownloadConfirmProvider } from "@/components/DownloadConfirmProvider";
import { canAccessAdminPath, getFirstAllowedAdminPath, hasAdminPathAccessRule } from "@/config/adminNavAccess";
import { resolveAdminTabTitle } from "@/config/adminNavTitle";
import { useAdminEvents } from "@/hooks/admin/useAdminEvents";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { useAdminT } from "@/hooks/useAdminT";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import AdminKeepAliveOutlet from "@/layouts/admin/AdminKeepAliveOutlet";
import AdminMobileBottomNav from "@/layouts/admin/AdminMobileBottomNav";
import AdminMobileSidebarDrawer from "@/layouts/admin/AdminMobileSidebarDrawer";
import AdminSidebarNav from "@/layouts/admin/AdminSidebarNav";
import AdminTopbar from "@/layouts/admin/AdminTopbar";
import {
  filterNav,
  mobileBottomTab,
  navItemsRaw,
  resolveNavLabels,
  type ResolvedNavChild,
  type ResolvedNavItem,
} from "@/layouts/admin/adminNavConfig";
import AdminWorkTabs from "@/layouts/admin/AdminWorkTabs";
import { AdminConfirmProvider } from "@/modules/admin/context/AdminConfirmContext";
import { AdminDirtyGuardProvider } from "@/modules/admin/context/AdminDirtyGuardContext";
import { AdminAccountSettingsProvider } from "@/modules/admin/context/AdminAccountSettingsContext";
import { AdminOrderVoiceProvider } from "@/modules/admin/components/AdminOrderVoiceNotifier";
import { AnimatedPage } from "@/modules/micro-interactions";
import { preloadAdminRoute } from "@/routes/adminLazyPages";
import { adminLogout, fetchAdminProfile, isAdminAuthenticated } from "@/services/admin/accountService";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { syncAdminWorkTabFromLocation, useAdminWorkTabsStore } from "@/stores/useAdminWorkTabsStore";

const ADMIN_NAV_PRELOAD_START_DELAY_MS = 900;
const ADMIN_NAV_PRELOAD_GAP_MS = 120;

function collectAdminNavPreloadPaths(items: ResolvedNavItem[]) {
  const paths: string[] = [];
  const seen = new Set<string>();
  const pushPath = (path?: string) => {
    if (path && !seen.has(path)) {
      seen.add(path);
      paths.push(path);
    }
  };
  const visitChildren = (children?: ResolvedNavChild[]) => {
    for (const child of children ?? []) {
      pushPath(child.path);
      visitChildren(child.children);
    }
  };

  for (const item of items) {
    pushPath(item.path);
    visitChildren(item.children);
  }
  return paths;
}

function childMatchesAdminPath(child: ResolvedNavChild, pathname: string): boolean {
  const ownPath = child.path ? pathname === child.path || pathname.startsWith(`${child.path}/`) : false;
  return ownPath || Boolean(child.children?.some((nested) => childMatchesAdminPath(nested, pathname)));
}

function collectActiveAdminGroupPreloadPaths(items: ResolvedNavItem[], pathname: string) {
  const activeGroup = items.find((item) => {
    const active = pathname === item.path || (item.path !== "/admin" && pathname.startsWith(`${item.path}/`));
    const childActive = item.children?.some((child) => childMatchesAdminPath(child, pathname));
    return active || childActive;
  });
  return activeGroup ? collectAdminNavPreloadPaths([activeGroup]) : [];
}

function shouldSkipAdminIdlePreload() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(connection?.saveData);
}

function AdminLayoutContent() {
  const navigate = useNavigate();
  const adminNavigate = useAdminNavigation();
  const location = useLocation();
  const { t, tText } = useAdminT();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const sidebarReturnFocusRef = useRef<HTMLElement | null>(null);
  const preloadedNavSignatureRef = useRef("");

  const can = useAdminPermissionStore((s) => s.can);
  const canAny = useAdminPermissionStore((s) => s.canAny);
  const isSuperAdmin = useAdminPermissionStore((s) => s.isSuperAdmin);
  const permHydrated = useAdminPermissionStore((s) => s.hydrated);
  const capabilities = useSiteCapabilities();
  useAdminEvents(true);

  const navItems = useMemo(
    () => resolveNavLabels(filterNav(navItemsRaw, can, canAny, capabilities), t),
    [can, canAny, capabilities, t],
  );

  useEffect(() => {
    if (!isAdminAuthenticated() || shouldSkipAdminIdlePreload()) return;
    const paths = collectAdminNavPreloadPaths(navItems);
    const signature = paths.join("|");
    if (!paths.length || signature === preloadedNavSignatureRef.current) return;
    preloadedNavSignatureRef.current = signature;

    let cancelled = false;
    let timer: ReturnType<typeof window.setTimeout> | null = null;

    const schedule = (cb: () => void, delay = ADMIN_NAV_PRELOAD_GAP_MS) => {
      timer = window.setTimeout(() => {
        if (cancelled) return;
        cb();
      }, delay);
    };

    const run = (index: number) => {
      if (cancelled || index >= paths.length) return;
      void preloadAdminRoute(paths[index]);
      schedule(() => run(index + 1));
    };

    schedule(() => run(0), ADMIN_NAV_PRELOAD_START_DELAY_MS);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [navItems]);

  useEffect(() => {
    if (!isAdminAuthenticated()) return;
    for (const path of collectActiveAdminGroupPreloadPaths(navItems, location.pathname)) {
      void preloadAdminRoute(path);
    }
  }, [navItems, location.pathname]);

  useEffect(() => {
    if (!isAdminAuthenticated()) return;
    fetchAdminProfile().catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAdminAuthenticated() || !permHydrated) return;
    const path = location.pathname;
    if (hasAdminPathAccessRule(path) && !canAccessAdminPath(path, can, canAny)) {
      toast.error(tText("没有权限访问该后台页面，已为你打开可访问的页面。"));
      navigate(getFirstAllowedAdminPath(can, canAny), { replace: true });
    }
  }, [location.pathname, can, canAny, navigate, permHydrated, tText]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleSidebarNavigate = useCallback(
    (path: string) => {
      void preloadAdminRoute(path);
      void adminNavigate(path);
      setSidebarOpen(false);
    },
    [adminNavigate],
  );

  const handleSidebarPreload = useCallback((path: string) => {
    void preloadAdminRoute(path);
  }, []);

  const handleOpenMobileSidebar = useCallback((trigger?: HTMLElement | null) => {
    if (trigger) sidebarReturnFocusRef.current = trigger;
    setSidebarOpen(true);
  }, []);

  const handleCloseMobileSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleBottomNavigate = useCallback(
    (path: string) => {
      void adminNavigate(path);
    },
    [adminNavigate],
  );

  const handleAdminLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setSidebarOpen(false);
    try {
      await adminLogout();
    } finally {
      navigate("/admin/login", { replace: true });
    }
  }, [loggingOut, navigate]);

  useEffect(() => {
    if (!isAdminAuthenticated()) return;
    const title = resolveAdminTabTitle(navItems, location.pathname, t("layout.title"), t, location.search);
    const result = syncAdminWorkTabFromLocation(location.pathname, location.search, title);
    if (result?.ok === false) {
      const { tabs, activeTabId } = useAdminWorkTabsStore.getState();
      const activeTab = tabs.find((tab) => tab.id === activeTabId);
      const currentPath = `${location.pathname}${location.search}`;
      if (activeTab && activeTab.path !== currentPath) {
        navigate(activeTab.path, { replace: true });
      }
    }
  }, [navItems, location.pathname, location.search, navigate, t]);

  const tab = mobileBottomTab(location.pathname);
  const showNotifTab = can("notification.manage") || can("notification.view");
  const canViewSecurityAlerts = isSuperAdmin || can("audit.view");
  const canUseOrderVoice = can("order.view");
  const showMobileDashboard = canAccessAdminPath("/admin", can, canAny);
  const showMobileProducts = canAccessAdminPath("/admin/products", can, canAny);
  const showMobileOrders = canAccessAdminPath("/admin/orders", can, canAny);

  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <DownloadConfirmProvider>
      <AdminConfirmProvider>
        <AdminDirtyGuardProvider>
          <AdminAccountSettingsProvider>
            <AdminOrderVoiceProvider>
              <div data-admin-shell className="flex min-h-[100dvh] items-start bg-[var(--theme-bg)] text-[var(--theme-text)]">
                <aside className="hidden w-[260px] shrink-0 self-start border-r border-[var(--theme-border)] bg-[var(--theme-card)] lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:max-h-[100dvh] lg:flex-col">
                  <AdminSidebarNav
                    scrollMode="inline"
                    navItems={navItems}
                    pathname={location.pathname}
                    onNavigate={handleSidebarNavigate}
                    onPreload={handleSidebarPreload}
                    onLogout={() => { void handleAdminLogout(); }}
                    loggingOut={loggingOut}
                    layoutTitle={t("layout.title")}
                    logoutLabel={t("layout.logout")}
                  />
                </aside>

                <AdminMobileSidebarDrawer
                  open={sidebarOpen}
                  navItems={navItems}
                  pathname={location.pathname}
                  onClose={handleCloseMobileSidebar}
                  onNavigate={handleSidebarNavigate}
                  onPreload={handleSidebarPreload}
                  onLogout={() => { void handleAdminLogout(); }}
                  loggingOut={loggingOut}
                  layoutTitle={t("layout.title")}
                  logoutLabel={t("layout.logout")}
                  closeLabel={t("layout.closeMenu")}
                  returnFocusRef={sidebarReturnFocusRef}
                />

                <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col overflow-hidden">
                  <header className="admin-chrome safe-area-pt sticky top-0 z-30 flex shrink-0 flex-col border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md">
                    <AdminTopbar
                      navItems={navItems}
                      showNotificationsTab={showNotifTab}
                      canViewSecurityAlerts={canViewSecurityAlerts}
                      canUseOrderVoice={canUseOrderVoice}
                      loggingOut={loggingOut}
                      onLogout={() => { void handleAdminLogout(); }}
                      onOpenMobileSidebar={handleOpenMobileSidebar}
                    />
                    <AdminWorkTabs />
                  </header>

                  <main className="admin-mobile-main admin-table-scope min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-[var(--admin-mobile-page-x)] sm:p-4 lg:p-6">
                    <Suspense fallback={<AdminOutletFallback />}>
                      <AnimatedPage>
                        <AdminKeepAliveOutlet />
                      </AnimatedPage>
                    </Suspense>
                  </main>

                  <AdminMobileBottomNav
                    tab={tab}
                    showDashboard={showMobileDashboard}
                    showProducts={showMobileProducts}
                    showOrders={showMobileOrders}
                    showNotifications={showNotifTab}
                    labels={{
                      mainNav: t("layout.mainNav"),
                      home: t("layout.mobileHome"),
                      products: t("layout.mobileProducts"),
                      orders: t("layout.mobileOrders"),
                      notifications: t("layout.mobileNotifications"),
                      more: t("layout.mobileMore"),
                    }}
                    onNavigate={handleBottomNavigate}
                    onOpenMore={handleOpenMobileSidebar}
                  />
                </div>
              </div>
            </AdminOrderVoiceProvider>
          </AdminAccountSettingsProvider>
        </AdminDirtyGuardProvider>
      </AdminConfirmProvider>
    </DownloadConfirmProvider>
  );
}

export default AdminLayoutContent;
