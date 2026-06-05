import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, Pin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ADMIN_WORK_TABS_MAX, adminTabPathKey } from "@/config/adminWorkTab";
import { useAdminWorkTabsStore, type AdminWorkTab } from "@/stores/useAdminWorkTabsStore";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
import { getFirstAllowedAdminPath } from "@/config/adminNavAccess";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { useAdminDirtyGuard } from "@/modules/admin/context/AdminDirtyGuardContext";
import AnchoredMenu from "@/components/admin/AnchoredMenu";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { preloadAdminRoute } from "@/routes/adminLazyPages";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type TabMenuState = {
  tabId: string;
  anchorEl: HTMLElement;
};

const TAB_MENU_WIDTH = 160;
const TAB_SCROLL_STEP = 180;

export default function AdminWorkTabs() {
  const { tText } = useAdminT();
  const adminNavigate = useAdminNavigation();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listBtnRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState<TabMenuState | null>(null);
  const tabMenuAnchorRef = useRef<HTMLElement | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const tabs = useAdminWorkTabsStore((s) => s.tabs);
  const activeTabId = useAdminWorkTabsStore((s) => s.activeTabId);
  const lastLimitNoticeAt = useAdminWorkTabsStore((s) => s.lastLimitNoticeAt);
  const consumeLimitNotice = useAdminWorkTabsStore((s) => s.consumeLimitNotice);
  const setActiveTab = useAdminWorkTabsStore((s) => s.setActiveTab);
  const closeTab = useAdminWorkTabsStore((s) => s.closeTab);
  const togglePinTab = useAdminWorkTabsStore((s) => s.togglePinTab);
  const can = useAdminPermissionStore((s) => s.can);
  const canAny = useAdminPermissionStore((s) => s.canAny);
  const { confirmDiscardTab, confirmDiscardTabs, setTabDirty } = useAdminDirtyGuard();

  const currentKey = adminTabPathKey(`${location.pathname}${location.search}`);
  const isFull = tabs.length >= ADMIN_WORK_TABS_MAX;

  const refreshScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    if (!lastLimitNoticeAt) return;
    toast.error(tText(`已打开 ${ADMIN_WORK_TABS_MAX} 个页面，请先关闭不需要的页面后再打开新页面。`));
    consumeLimitNotice();
  }, [consumeLimitNotice, lastLimitNoticeAt, tText]);

  useEffect(() => {
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-tab-id="${activeTabId}"]`);
    el?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  }, [activeTabId, tabs.length]);

  useEffect(() => {
    refreshScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", refreshScrollState, { passive: true });
    const observer = new ResizeObserver(refreshScrollState);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", refreshScrollState);
      observer.disconnect();
    };
  }, [refreshScrollState, tabs.length]);

  useEffect(() => {
    if (!menu && !listOpen) return;
    const close = () => {
      setMenu(null);
      setListOpen(false);
    };
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [listOpen, menu]);

  const scrollTabs = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -TAB_SCROLL_STEP : TAB_SCROLL_STEP, behavior: "smooth" });
  };

  const activateTab = useCallback(
    (tab: AdminWorkTab) => {
      setActiveTab(tab.id);
      if (`${location.pathname}${location.search}` !== tab.path) {
        void preloadAdminRoute(tab.path);
        void adminNavigate(tab.path);
      }
    },
    [adminNavigate, location.pathname, location.search, setActiveTab],
  );

  const handleClose = useCallback(
    async (tab: AdminWorkTab, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (tab.pinned) return;
      const proceed = await confirmDiscardTab(tab.id, tab.title);
      if (!proceed) return;
      setTabDirty(tab.id, false);
      const fallbackPath = closeTab(tab.id);
      if (fallbackPath) {
        void adminNavigate(fallbackPath);
        return;
      }
      if (activeTabId === tab.id) {
        void adminNavigate(getFirstAllowedAdminPath(can, canAny));
      }
    },
    [activeTabId, adminNavigate, can, canAny, closeTab, confirmDiscardTab, setTabDirty],
  );

  const closeTabsBatch = useCallback(
    async (victims: AdminWorkTab[]) => {
      if (victims.length === 0) return;
      const proceed = await confirmDiscardTabs(victims);
      if (!proceed) return;
      let navPath: string | null = null;
      for (const tab of victims) {
        setTabDirty(tab.id, false);
        const path = closeTab(tab.id);
        if (path) navPath = path;
      }
      if (navPath) {
        void adminNavigate(navPath);
        return;
      }
      if (victims.some((tab) => tab.id === activeTabId)) {
        void adminNavigate(getFirstAllowedAdminPath(can, canAny));
      }
    },
    [activeTabId, adminNavigate, can, canAny, closeTab, confirmDiscardTabs, setTabDirty],
  );

  const openContextMenu = (tab: AdminWorkTab, e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setListOpen(false);
    tabMenuAnchorRef.current = e.currentTarget;
    setMenu({ tabId: tab.id, anchorEl: e.currentTarget });
  };

  const menuTab = menu ? tabs.find((t) => t.id === menu.tabId) : null;
  const activeTab = tabs.find((tab) => tab.id === activeTabId || tab.id === currentKey) ?? tabs[0];

  if (tabs.length === 0) {
    return (
      <div className="admin-work-tabs flex h-[var(--admin-chrome-tabs-h)] shrink-0 items-center border-t border-[var(--theme-border)] px-3 text-xs text-muted-foreground">
        <Tx>从左侧菜单打开页面后，将在此显示快捷标签</Tx>
      </div>
    );
  }

  return (
    <>
      <div className="admin-work-tabs-shell flex h-[var(--admin-chrome-tabs-h)] w-full min-w-0 max-w-full shrink-0 items-center overflow-hidden border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/90">
        <UnifiedButton
          type="button"
          aria-label={tText("向左滚动标签")}
          disabled={!canScrollLeft}
          onClick={() => scrollTabs("left")}
          className="ml-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary disabled:opacity-30 sm:flex"
        >
          <ChevronLeft size={16} />
        </UnifiedButton>

        <div
          ref={scrollRef}
          className="admin-work-tabs hidden h-full min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden scroll-smooth px-1 py-1 sm:flex"
          role="tablist"
          aria-label={tText("已打开页面")}
        >
          {tabs.map((tab) => {
            const active = tab.id === activeTabId || tab.id === currentKey;
            return (
              <div
                key={tab.id}
                data-tab-id={tab.id}
                role="tab"
                aria-selected={active}
                onContextMenu={(e) => openContextMenu(tab, e)}
                className={cn(
                  "admin-work-tab-item group relative flex h-7 max-w-[12rem] shrink-0 items-center overflow-hidden rounded-full border px-2.5 text-xs leading-none transition-all",
                  active
                    ? "z-[1] border-[var(--theme-price)] btn-theme-price font-semibold shadow-sm"
                    : "border-transparent bg-transparent text-muted-foreground hover:border-[color-mix(in_srgb,var(--theme-price)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--theme-price)_8%,var(--theme-surface))] hover:text-foreground",
                )}
              >
                <UnifiedButton
                  type="button"
                  className="flex h-full min-w-0 flex-1 items-center gap-1 truncate text-left leading-none"
                  onPointerEnter={() => { void preloadAdminRoute(tab.path); }}
                  onFocus={() => { void preloadAdminRoute(tab.path); }}
                  onClick={() => activateTab(tab)}
                  title={tab.title}
                >
                  {tab.pinned ? <Pin size={11} className="shrink-0 opacity-70" /> : null}
                  <span className="truncate">{tab.title}</span>
                </UnifiedButton>
              </div>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1 px-2 sm:hidden">
          {activeTab.pinned ? <Pin size={12} className="shrink-0 text-muted-foreground" /> : null}
          <span className="truncate text-xs font-semibold text-foreground">{activeTab.title}</span>
        </div>

        <UnifiedButton
          type="button"
          aria-label={tText("向右滚动标签")}
          disabled={!canScrollRight}
          onClick={() => scrollTabs("right")}
          className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary disabled:opacity-30 sm:flex"
        >
          <ChevronRight size={16} />
        </UnifiedButton>

        <div className="admin-work-tabs-tools flex h-full shrink-0 items-center gap-1.5 overflow-hidden border-l border-[var(--theme-border)]/70 pl-1.5 pr-2">
          <div ref={listRef} className="relative shrink-0">
            <UnifiedButton
              ref={listBtnRef}
              type="button"
              aria-label={tText("全部标签")}
              aria-expanded={listOpen}
              onClick={(e) => {
                e.stopPropagation();
                setMenu(null);
                setListOpen((open) => !open);
              }}
              className="flex h-8 min-w-[4.25rem] items-center justify-center gap-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-card)] px-2.5 text-[12px] font-medium leading-none text-muted-foreground shadow-sm transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Tx>全部</Tx>
              <ChevronDown size={13} className={cn("shrink-0 transition-transform", listOpen ? "rotate-180" : "")} />
            </UnifiedButton>
            <AnchoredMenu open={listOpen} onClose={() => setListOpen(false)} anchorRef={listBtnRef} width={224} gap={6} placement="bottom-end">
              <div className="max-h-64 overflow-y-auto py-1 text-sm" onClick={(e) => e.stopPropagation()}>
                {tabs.map((tab) => {
                  const active = tab.id === activeTabId || tab.id === currentKey;
                  return (
                    <UnifiedButton
                      key={tab.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-secondary",
                        active ? "font-semibold text-foreground" : "text-muted-foreground",
                      )}
                      onPointerEnter={() => { void preloadAdminRoute(tab.path); }}
                      onFocus={() => { void preloadAdminRoute(tab.path); }}
                      onClick={() => {
                        activateTab(tab);
                        setListOpen(false);
                      }}
                    >
                      {tab.pinned ? <Pin size={12} className="shrink-0 opacity-70" /> : <span className="w-3 shrink-0" />}
                      <span className="min-w-0 flex-1 truncate">{tab.title}</span>
                    </UnifiedButton>
                  );
                })}
              </div>
            </AnchoredMenu>
          </div>

          <div
            className={cn(
              "flex h-8 min-w-[3.5rem] shrink-0 items-center justify-center rounded-full border px-2.5 text-[12px] font-semibold leading-none shadow-sm",
              isFull
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-[var(--theme-border)] bg-[var(--theme-card)] text-muted-foreground",
            )}
            title={isFull ? tText("标签已达上限，请关闭不需要的页面") : tText("已打开页面数量")}
          >
            {tabs.length}/{ADMIN_WORK_TABS_MAX}
          </div>
        </div>
      </div>

      <AnchoredMenu
        open={Boolean(menu && menuTab)}
        onClose={() => setMenu(null)}
        anchorRef={tabMenuAnchorRef}
        width={TAB_MENU_WIDTH}
      >
        {menuTab ? (
          <>
            <UnifiedButton
              type="button"
              className="flex w-full px-3 py-2 text-left hover:bg-secondary disabled:opacity-50"
              disabled={menuTab.pinned}
              onClick={() => {
                handleClose(menuTab);
                setMenu(null);
              }}
            >
              <Tx>关闭</Tx>
            </UnifiedButton>
            <UnifiedButton
              type="button"
              className="flex w-full px-3 py-2 text-left hover:bg-secondary"
              onClick={() => {
                void (async () => {
                  const victims = tabs.filter((t) => t.id !== menuTab.id && !t.pinned);
                  await closeTabsBatch(victims);
                  setActiveTab(menuTab.id);
                  if (`${location.pathname}${location.search}` !== menuTab.path) {
                    void adminNavigate(menuTab.path);
                  }
                  setMenu(null);
                })();
              }}
            >
              <Tx>关闭其他</Tx>
            </UnifiedButton>
            <UnifiedButton
              type="button"
              className="flex w-full px-3 py-2 text-left hover:bg-secondary"
              onClick={() => {
                void (async () => {
                  const idx = tabs.findIndex((t) => t.id === menuTab.id);
                  const victims = idx < 0 ? [] : tabs.slice(idx + 1).filter((t) => !t.pinned);
                  await closeTabsBatch(victims);
                  setActiveTab(menuTab.id);
                  if (`${location.pathname}${location.search}` !== menuTab.path) {
                    void adminNavigate(menuTab.path);
                  }
                  setMenu(null);
                })();
              }}
            >
              <Tx>关闭右侧</Tx>
            </UnifiedButton>
            <UnifiedButton
              type="button"
              className="flex w-full px-3 py-2 text-left hover:bg-secondary"
              onClick={() => {
                togglePinTab(menuTab.id);
                setMenu(null);
              }}
            >
              {menuTab.pinned ? <Tx>取消固定</Tx> : <Tx>固定标签</Tx>}
            </UnifiedButton>
          </>
        ) : null}
      </AnchoredMenu>
    </>
  );
}
