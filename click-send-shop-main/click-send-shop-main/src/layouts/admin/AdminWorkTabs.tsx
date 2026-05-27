import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

type TabMenuState = {
  tabId: string;
  anchorEl: HTMLElement;
};

const TAB_MENU_WIDTH = 160;
const TAB_SCROLL_STEP = 180;

export default function AdminWorkTabs() {
  const { tText } = useAdminT();
  const navigate = useNavigate();
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
        navigate(tab.path);
      }
    },
    [location.pathname, location.search, navigate, setActiveTab],
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
        navigate(fallbackPath);
        return;
      }
      if (activeTabId === tab.id) {
        navigate(getFirstAllowedAdminPath(can, canAny));
      }
    },
    [activeTabId, can, canAny, closeTab, confirmDiscardTab, navigate, setTabDirty],
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
        navigate(navPath);
        return;
      }
      if (victims.some((tab) => tab.id === activeTabId)) {
        navigate(getFirstAllowedAdminPath(can, canAny));
      }
    },
    [activeTabId, can, canAny, closeTab, confirmDiscardTabs, navigate, setTabDirty],
  );

  const openContextMenu = (tab: AdminWorkTab, e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setListOpen(false);
    tabMenuAnchorRef.current = e.currentTarget;
    setMenu({ tabId: tab.id, anchorEl: e.currentTarget });
  };

  const menuTab = menu ? tabs.find((t) => t.id === menu.tabId) : null;

  if (tabs.length === 0) {
    return (
      <div className="admin-work-tabs flex h-[var(--admin-chrome-tabs-h)] shrink-0 items-center border-t border-[var(--theme-border)] px-3 text-xs text-muted-foreground">
        <Tx>从左侧菜单打开页面后，将在此显示快捷标签</Tx>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-[var(--admin-chrome-tabs-h)] shrink-0 items-center border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/90">
        <button
          type="button"
          aria-label={tText("向左滚动标签")}
          disabled={!canScrollLeft}
          onClick={() => scrollTabs("left")}
          className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>

        <div
          ref={scrollRef}
          className="admin-work-tabs flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden scroll-smooth px-1"
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
                  "group relative flex max-w-[12rem] shrink-0 items-center rounded-full border px-3 py-1.5 text-xs transition-all",
                  active
                    ? "z-[1] border-[var(--theme-price)] btn-theme-price font-semibold shadow-sm"
                    : "border-transparent bg-transparent text-muted-foreground hover:border-[color-mix(in_srgb,var(--theme-price)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--theme-price)_8%,var(--theme-surface))] hover:text-foreground",
                )}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-1 truncate text-left"
                  onClick={() => activateTab(tab)}
                  title={tab.title}
                >
                  {tab.pinned ? <Pin size={11} className="shrink-0 opacity-70" /> : null}
                  <span className="truncate">{tab.title}</span>
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          aria-label={tText("向右滚动标签")}
          disabled={!canScrollRight}
          onClick={() => scrollTabs("right")}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>

        <div ref={listRef} className="relative mx-1 shrink-0">
          <button
            ref={listBtnRef}
            type="button"
            aria-label={tText("全部标签")}
            aria-expanded={listOpen}
            onClick={(e) => {
              e.stopPropagation();
              setMenu(null);
              setListOpen((open) => !open);
            }}
            className="flex h-7 items-center gap-0.5 rounded-md border border-[var(--theme-border)] px-2 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Tx>全部</Tx>
            <ChevronDown size={12} className={cn("transition-transform", listOpen ? "rotate-180" : "")} />
          </button>
          <AnchoredMenu open={listOpen} onClose={() => setListOpen(false)} anchorRef={listBtnRef} width={224} gap={6}>
            <div className="max-h-64 overflow-y-auto py-1 text-sm" onClick={(e) => e.stopPropagation()}>
              {tabs.map((tab) => {
                const active = tab.id === activeTabId || tab.id === currentKey;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-secondary",
                      active ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                    onClick={() => {
                      activateTab(tab);
                      setListOpen(false);
                    }}
                  >
                    {tab.pinned ? <Pin size={12} className="shrink-0 opacity-70" /> : <span className="w-3 shrink-0" />}
                    <span className="min-w-0 flex-1 truncate">{tab.title}</span>
                  </button>
                );
              })}
            </div>
          </AnchoredMenu>
        </div>

        <div
          className={cn(
            "mr-2 shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            isFull
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-[var(--theme-border)] bg-[var(--theme-card)] text-muted-foreground",
          )}
          title={isFull ? tText("标签已达上限，请关闭不需要的页面") : tText("已打开页面数量")}
        >
          {tabs.length}/{ADMIN_WORK_TABS_MAX}
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
            <button
              type="button"
              className="flex w-full px-3 py-2 text-left hover:bg-secondary disabled:opacity-50"
              disabled={menuTab.pinned}
              onClick={() => {
                handleClose(menuTab);
                setMenu(null);
              }}
            >
              <Tx>关闭</Tx>
            </button>
            <button
              type="button"
              className="flex w-full px-3 py-2 text-left hover:bg-secondary"
              onClick={() => {
                void (async () => {
                  const victims = tabs.filter((t) => t.id !== menuTab.id && !t.pinned);
                  await closeTabsBatch(victims);
                  setActiveTab(menuTab.id);
                  if (`${location.pathname}${location.search}` !== menuTab.path) {
                    navigate(menuTab.path);
                  }
                  setMenu(null);
                })();
              }}
            >
              <Tx>关闭其他</Tx>
            </button>
            <button
              type="button"
              className="flex w-full px-3 py-2 text-left hover:bg-secondary"
              onClick={() => {
                void (async () => {
                  const idx = tabs.findIndex((t) => t.id === menuTab.id);
                  const victims = idx < 0 ? [] : tabs.slice(idx + 1).filter((t) => !t.pinned);
                  await closeTabsBatch(victims);
                  setActiveTab(menuTab.id);
                  if (`${location.pathname}${location.search}` !== menuTab.path) {
                    navigate(menuTab.path);
                  }
                  setMenu(null);
                })();
              }}
            >
              <Tx>关闭右侧</Tx>
            </button>
            <button
              type="button"
              className="flex w-full px-3 py-2 text-left hover:bg-secondary"
              onClick={() => {
                togglePinTab(menuTab.id);
                setMenu(null);
              }}
            >
              {menuTab.pinned ? <Tx>取消固定</Tx> : <Tx>固定标签</Tx>}
            </button>
          </>
        ) : null}
      </AnchoredMenu>
    </>
  );
}
