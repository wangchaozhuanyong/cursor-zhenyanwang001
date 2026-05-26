import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminTabPathKey } from "@/config/adminWorkTab";
import { useAdminWorkTabsStore, type AdminWorkTab } from "@/stores/useAdminWorkTabsStore";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
import { getFirstAllowedAdminPath } from "@/config/adminNavAccess";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { useAdminDirtyGuard } from "@/modules/admin/context/AdminDirtyGuardContext";

type TabMenuState = {
  tabId: string;
  x: number;
  y: number;
};

const TAB_MENU_WIDTH = 160;
const TAB_MENU_ESTIMATED_HEIGHT = 176;
const TAB_MENU_GAP = 6;
const TAB_MENU_VIEWPORT_PADDING = 8;

export default function AdminWorkTabs() {
  const { tText } = useAdminT();
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<TabMenuState | null>(null);

  const tabs = useAdminWorkTabsStore((s) => s.tabs);
  const activeTabId = useAdminWorkTabsStore((s) => s.activeTabId);
  const setActiveTab = useAdminWorkTabsStore((s) => s.setActiveTab);
  const closeTab = useAdminWorkTabsStore((s) => s.closeTab);
  const togglePinTab = useAdminWorkTabsStore((s) => s.togglePinTab);
  const can = useAdminPermissionStore((s) => s.can);
  const canAny = useAdminPermissionStore((s) => s.canAny);
  const { confirmDiscardTab, confirmDiscardTabs, setTabDirty } = useAdminDirtyGuard();

  const currentKey = adminTabPathKey(`${location.pathname}${location.search}`);

  useEffect(() => {
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-tab-id="${activeTabId}"]`);
    el?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  }, [activeTabId, tabs.length]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);

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
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxLeft = Math.max(TAB_MENU_VIEWPORT_PADDING, viewportWidth - TAB_MENU_WIDTH - TAB_MENU_VIEWPORT_PADDING);
    const maxTop = Math.max(TAB_MENU_VIEWPORT_PADDING, viewportHeight - TAB_MENU_ESTIMATED_HEIGHT - TAB_MENU_VIEWPORT_PADDING);
    const preferredLeft = e.clientX + TAB_MENU_GAP;
    const fallbackLeft = e.clientX - TAB_MENU_WIDTH - TAB_MENU_GAP;
    const preferredTop = e.clientY + TAB_MENU_GAP;
    const fallbackTop = e.clientY - TAB_MENU_ESTIMATED_HEIGHT - TAB_MENU_GAP;
    const left = preferredLeft + TAB_MENU_WIDTH <= viewportWidth - TAB_MENU_VIEWPORT_PADDING
      ? preferredLeft
      : Math.max(TAB_MENU_VIEWPORT_PADDING, fallbackLeft);
    const top = preferredTop + TAB_MENU_ESTIMATED_HEIGHT <= viewportHeight - TAB_MENU_VIEWPORT_PADDING
      ? preferredTop
      : Math.max(TAB_MENU_VIEWPORT_PADDING, fallbackTop);
    setMenu({ tabId: tab.id, x: Math.min(left, maxLeft), y: Math.min(top, maxTop) });
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
      <div
        ref={scrollRef}
        className="admin-work-tabs flex h-[var(--admin-chrome-tabs-h)] shrink-0 items-center gap-1 overflow-x-auto overflow-y-hidden scroll-smooth border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/90 px-1.5"
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
                "group relative flex max-w-[11rem] shrink-0 items-center rounded-full border px-3 py-1.5 text-xs transition-all",
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

      {menu && menuTab ? (
        <div
          className="fixed z-[60] w-40 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] py-1 text-sm shadow-lg"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
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
        </div>
      ) : null}
    </>
  );
}
