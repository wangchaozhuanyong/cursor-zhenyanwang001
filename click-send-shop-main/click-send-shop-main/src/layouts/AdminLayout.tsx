import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedPage } from "@/modules/micro-interactions";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { AdminOutletFallback } from "@/components/AppRouteFallback";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Menu,
  Bell,
  Search,
  ChevronDown,
  Shield,
  Palette,
  LogOut,
  Languages,
  LayoutGrid,
  AlertTriangle,
} from "lucide-react";
import AdminAccountSettingsTrigger from "@/components/admin/AdminAccountSettingsTrigger";
import { AdminAccountSettingsProvider } from "@/modules/admin/context/AdminAccountSettingsContext";
import { resolveAdminTabTitle } from "@/config/adminNavTitle";
import { syncAdminWorkTabFromLocation, useAdminWorkTabsStore } from "@/stores/useAdminWorkTabsStore";
import AdminWorkTabs from "@/layouts/admin/AdminWorkTabs";
import SkinPickerDialog from "@/components/SkinPickerDialog";
import { useAdminT } from "@/hooks/useAdminT";
import type { AdminLocale } from "@/i18n/admin";
import { isAdminAuthenticated, adminLogout, fetchAdminProfile } from "@/services/admin/accountService";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { canAccessAdminPath, getFirstAllowedAdminPath } from "@/config/adminNavAccess";
import { AdminConfirmProvider } from "@/modules/admin/context/AdminConfirmContext";
import { AdminDirtyGuardProvider } from "@/modules/admin/context/AdminDirtyGuardContext";
import AdminKeepAliveOutlet from "@/layouts/admin/AdminKeepAliveOutlet";
import { DownloadConfirmProvider } from "@/components/DownloadConfirmProvider";
import {
  AdminOrderVoiceMenuItems,
  AdminOrderVoiceProvider,
  AdminOrderVoiceToolbar,
} from "@/modules/admin/components/AdminOrderVoiceNotifier";
import AdminEventBell from "@/modules/admin/components/AdminEventBell";
import { isAdminMfaStepUpPending } from "@/lib/adminMfaStepUp";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useAdminEvents } from "@/hooks/admin/useAdminEvents";
import { getSecurityAlerts, type SecurityAlertSummary } from "@/api/admin/audit";
import { Tx } from "@/components/admin/AdminText";
import {
  applyAdminTextTranslation,
  localizedAuditSummary,
  zhActionType,
} from "@/utils/auditLogI18n";
import {
  filterNav,
  mobileBottomTab,
  navItemsRaw,
  resolveNavLabels,
  type ResolvedNavChild,
} from "@/layouts/admin/adminNavConfig";
import AdminSidebarNav, { AdminNavTab } from "@/layouts/admin/AdminSidebarNav";
import AnchoredMenu from "@/components/admin/AnchoredMenu";

function AdminLayoutContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, locale, setLocale, tText } = useAdminT();
  const labelize = useCallback(
    (zh: string) => applyAdminTextTranslation(zh, tText),
    [tText],
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [skinPickerOpen, setSkinPickerOpen] = useState(false);
  const [topSearch, setTopSearch] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlertSummary | null>(null);
  const [securityAlertsOpen, setSecurityAlertsOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const securityAlertsRef = useRef<HTMLDivElement>(null);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);
  const securityBtnRef = useRef<HTMLButtonElement>(null);

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

  // 头像菜单 / 安全告警弹层改由 AnchoredMenu 统一关闭逻辑处理（click/contextmenu/ESC/scroll/resize）

  useEffect(() => {
    if (!isAdminAuthenticated() || !canViewSecurityAlerts) {
      setSecurityAlerts(null);
      return;
    }

    let alive = true;
    const load = async () => {
      if (isAdminMfaStepUpPending()) return;
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
    const findChild = (children?: ResolvedNavChild[]): ResolvedNavChild | undefined => {
      for (const child of children ?? []) {
        if (child.label.includes(lq)) return child;
        const nested = findChild(child.children);
        if (nested) return nested;
      }
      return undefined;
    };
    const match = navItems.find((n) => n.label.includes(lq) || findChild(n.children));
    if (match) {
      const child = findChild(match.children);
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

  useEffect(() => {
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
  const securityAlertCount = securityAlerts?.total ?? 0;

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

      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col overflow-hidden">
        <header className="admin-chrome safe-area-pt sticky top-0 z-30 flex shrink-0 flex-col border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md">
          <div className="admin-chrome-toolbar flex h-[var(--admin-chrome-toolbar-h)] min-h-[var(--admin-chrome-toolbar-h)] items-center gap-2 px-[var(--admin-mobile-page-x)] sm:px-4 lg:px-6">
            <button
              type="button"
              aria-label={t("layout.openMenu")}
              className="touch-manipulation flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-secondary lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0 flex-1" aria-hidden />
            <div className="flex shrink-0 flex-nowrap items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              aria-label={t("layout.searchMenu")}
              className="touch-manipulation flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary md:hidden"
              onClick={() => setMobileSearchOpen((v) => !v)}
            >
              <Search size={18} />
            </button>
            <div className="hidden items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 md:flex">
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
            {(showNotifTab || canViewSecurityAlerts) && (
              <div ref={securityAlertsRef} className="relative shrink-0">
                <button
                  ref={securityBtnRef}
                  type="button"
                  aria-label={canViewSecurityAlerts ? "安全告警" : t("layout.notifications")}
                  title={canViewSecurityAlerts ? "安全告警" : "通知中心"}
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
                <AnchoredMenu
                  open={securityAlertsOpen && canViewSecurityAlerts}
                  onClose={() => setSecurityAlertsOpen(false)}
                  anchorRef={securityBtnRef}
                  width={352}
                  gap={6}
                  className="p-2"
                >
                  <motion.div className="w-[min(92vw,22rem)]">
                    <div className="flex items-center justify-between px-2 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Shield size={16} className="shrink-0 text-destructive" />
                        <p className="truncate text-sm font-semibold text-foreground"><Tx>安全监控</Tx></p>
                      </div>
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                        onClick={() => {
                          setSecurityAlertsOpen(false);
                          navigate("/admin/audit-logs?keyword=security");
                        }}
                      >
                        <Tx>审计日志</Tx>
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
                              navigate(`/admin/audit-logs?actionType=${encodeURIComponent(item.action_type)}`);
                            }}
                          >
                            <AlertTriangle size={15} className={`mt-0.5 shrink-0 ${item.result === "failure" ? "text-destructive" : "text-[var(--theme-primary)]"}`} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium text-foreground">
                                {item.summary
                                  ? localizedAuditSummary(item.summary, tText)
                                  : labelize(zhActionType(item.action_type))}
                              </span>
                              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{item.ip || "-"} · {new Date(item.created_at).toLocaleString()}</span>
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-2 py-6 text-center text-xs text-muted-foreground"><Tx>近 24 小时暂无安全告警</Tx></div>
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
                </AnchoredMenu>
              </div>
            )}
            {can("order.view") ? <AdminOrderVoiceToolbar /> : null}
            <div ref={avatarRef} className="relative shrink-0">
              <button
                ref={avatarBtnRef}
                type="button"
                aria-label={t("layout.account")}
                className="touch-manipulation flex h-9 min-w-[40px] items-center gap-1 rounded-lg px-1 hover:bg-secondary"
                onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--theme-primary)] text-xs font-bold text-[var(--theme-primary-foreground)]">A</div>
                <ChevronDown size={14} className={`hidden text-muted-foreground transition-transform sm:block ${avatarMenuOpen ? "rotate-180" : ""}`} />
              </button>
              <AnchoredMenu
                open={avatarMenuOpen}
                onClose={() => setAvatarMenuOpen(false)}
                anchorRef={avatarBtnRef}
                width={224}
                gap={6}
                className="py-1"
              >
                <motion.div className="w-56">
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
                  {can("order.view") ? (
                    <>
                      <div className="mx-3 my-1 h-px bg-border sm:hidden" />
                      <AdminOrderVoiceMenuItems onClose={() => setAvatarMenuOpen(false)} />
                    </>
                  ) : null}
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
                          onClick={() => {
                            setLocale(loc);
                            setAvatarMenuOpen(false);
                          }}
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
                  <AdminAccountSettingsTrigger tab="profile" onBeforeOpen={() => setAvatarMenuOpen(false)} />
                  <AdminAccountSettingsTrigger tab="password" onBeforeOpen={() => setAvatarMenuOpen(false)} />
                  <div className="mx-3 my-1 h-px bg-border" />
                  <button
                    type="button"
                    onClick={() => {
                      adminLogout();
                      navigate("/admin/login");
                      setAvatarMenuOpen(false);
                    }}
                    className="flex min-h-[44px] w-full items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-secondary"
                  >
                    <LogOut size={16} />
                    {t("layout.logout")}
                  </button>
                </motion.div>
              </AnchoredMenu>
            </div>
            </div>
          </div>

          {mobileSearchOpen ? (
            <div className="border-t border-[var(--theme-border)] px-3 py-2 md:hidden">
              <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
                <Search size={16} className="shrink-0 text-muted-foreground" />
                <input
                  placeholder={t("layout.searchMenu")}
                  value={topSearch}
                  onChange={(e) => setTopSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleTopSearch();
                      setMobileSearchOpen(false);
                    }
                  }}
                  className="min-h-[36px] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          ) : null}

          <AdminWorkTabs />
        </header>

        <main className="admin-mobile-main admin-table-scope min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-[var(--admin-mobile-page-x)] sm:p-4 lg:p-6">
          <Suspense fallback={<AdminOutletFallback />}>
            <AnimatedPage>
              <AdminKeepAliveOutlet />
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
    </div>
    </AdminOrderVoiceProvider>
    </AdminAccountSettingsProvider>
    </AdminDirtyGuardProvider>
    </AdminConfirmProvider>
    </DownloadConfirmProvider>
  );
}

export default AdminLayoutContent;
