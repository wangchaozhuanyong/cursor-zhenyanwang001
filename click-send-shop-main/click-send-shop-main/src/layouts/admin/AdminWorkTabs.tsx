import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Pin, X } from "lucide-react";
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

  const openContextMenu = (tab: AdminWorkTab, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ tabId: tab.id, x: e.clientX, y: e.clientY });
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
        className="admin-work-tabs flex h-[var(--admin-chrome-tabs-h)] shrink-0 items-stretch gap-0.5 overflow-x-auto border-t border-[var(--theme-border)] bg-[var(--theme-surface)]/90 px-1 scrollbar-thin"
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
              className={cn(
                "group relative flex max-w-[11rem] shrink-0 items-center gap-1 rounded-t-md border border-b-0 px-2.5 py-1 text-xs transition-colors",
                active
                  ? "z-[1] border-[var(--theme-border)] bg-[var(--theme-bg)] font-medium text-foreground"
                  : "border-transparent bg-transparent text-muted-foreground hover:bg-[var(--theme-bg)]/60 hover:text-foreground",
              )}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-1 truncate text-left"
                onClick={() => activateTab(tab)}
                onContextMenu={(e) => openContextMenu(tab, e)}
                onAuxClick={(e) => {
                  if (e.button === 1) handleClose(tab, e);
                }}
                title={tab.title}
              >
                {tab.pinned ? <Pin size={11} className="shrink-0 opacity-70" /> : null}
                <span className="truncate">{tab.title}</span>
              </button>
              {!tab.pinned ? (
                <button
                  type="button"
                  aria-label={tText("关闭标签")}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-70 hover:bg-secondary hover:opacity-100"
                  onClick={(e) => handleClose(tab, e)}
                >
                  <X size={12} />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {menu && menuTab ? (
        <div
          className="fixed z-[60] min-w-[10rem] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] py-1 text-sm shadow-lg"
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
