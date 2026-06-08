import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Navigate, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { AdminOutletFallback, DelayedRouteFallback } from "@/components/AppRouteFallback";
import { DownloadConfirmProvider } from "@/components/DownloadConfirmProvider";
import AdminOfflineBanner from "@/components/admin/AdminOfflineBanner";
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
} from "@/layouts/admin/adminNavConfig";
import AdminWorkTabs from "@/layouts/admin/AdminWorkTabs";
import { AdminConfirmProvider } from "@/modules/admin/context/AdminConfirmContext";
import { AdminDirtyGuardProvider } from "@/modules/admin/context/AdminDirtyGuardContext";
import { AdminAccountSettingsProvider } from "@/modules/admin/context/AdminAccountSettingsContext";
import { AdminOrderVoiceProvider } from "@/modules/admin/components/AdminOrderVoiceNotifier";
import { observeAdminLongTasks } from "@/modules/admin/utils/adminDebug";
import { AnimatedPage } from "@/modules/micro-interactions/components/AnimatedPage";
import { preloadAdminRoute } from "@/routes/adminLazyPages";
import { adminLogout, fetchAdminProfile, isAdminAuthenticated } from "@/services/admin/accountService";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { syncAdminWorkTabFromLocation, useAdminWorkTabsStore } from "@/stores/useAdminWorkTabsStore";

const MONITORING_SUBNAV_PATHS = new Set([
  "/admin/monitoring",
  "/admin/monitoring/anomalies",
  "/admin/monitoring/repair-tasks",
  "/admin/monitoring/rules",
  "/admin/monitoring/runs",
]);

function isMonitoringSubnavSwitch(previousPath: string, nextPath: string) {
  return previousPath !== nextPath && MONITORING_SUBNAV_PATHS.has(previousPath) && MONITORING_SUBNAV_PATHS.has(nextPath);
}

function AdminLayoutInner() {
  const navigate = useNavigate();
  const adminNavigate = useAdminNavigation();
  const location = useLocation();
  const navigationType = useNavigationType();
  const { t, tText } = useAdminT();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const previousPathRef = useRef(location.pathname);
  const sidebarReturnFocusRef = useRef<HTMLElement | null>(null);

  const can = useAdminPermissionStore((s) => s.can);
  const canAny = useAdminPermissionStore((s) => s.canAny);
  const isSuperAdmin = useAdminPermissionStore((s) => s.isSuperAdmin);
  const permHydrated = useAdminPermissionStore((s) => s.hydrated);
  const capabilities = useSiteCapabilities();
  useAdminEvents(true);
  useEffect(() => {
    observeAdminLongTasks();
  }, []);

  const navItems = useMemo(
    () => resolveNavLabels(filterNav(navItemsRaw, can, canAny, capabilities), t),
    [can, canAny, capabilities, t],
  );

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

  useLayoutEffect(() => {
    const previousPath = previousPathRef.current;
    previousPathRef.current = location.pathname;
    if (navigationType === "POP") return;
    if (isMonitoringSubnavSwitch(previousPath, location.pathname)) return;
    mainScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, navigationType]);

  const handleSidebarNavigate = useCallback(
    (path: string) => {
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
    <AdminAccountSettingsProvider>
      <AdminOrderVoiceProvider>
        <div data-admin-shell className="flex min-h-[100dvh] w-full overflow-x-hidden bg-[var(--theme-bg)] text-[var(--theme-text)]">
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

                <div className="flex min-h-[100dvh] min-w-0 max-w-full flex-1 flex-col overflow-hidden">
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
                    <AdminOfflineBanner />
                  </header>

                  <main ref={mainScrollRef} className="admin-mobile-main admin-table-scope min-h-0 w-full max-w-full flex-1 overflow-y-auto overflow-x-hidden p-[var(--admin-mobile-page-x)] sm:p-4 lg:p-6">
                    <Suspense fallback={<DelayedRouteFallback fallback={<AdminOutletFallback />} />}>
                      <AnimatedPage disableAnimation>
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
  );
}

export default function AdminLayout() {
  return (
    <DownloadConfirmProvider>
      <AdminConfirmProvider>
        <AdminDirtyGuardProvider>
          <AdminLayoutInner />
        </AdminDirtyGuardProvider>
      </AdminConfirmProvider>
    </DownloadConfirmProvider>
  );
}
