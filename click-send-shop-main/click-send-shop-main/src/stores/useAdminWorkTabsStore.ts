import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  ADMIN_WORK_TABS_MAX,
  ADMIN_WORK_TABS_STORAGE_KEY,
  adminTabPathKey,
  normalizeAdminTabPath,
  shouldTrackAdminWorkTab,
} from "@/config/adminWorkTab";

export type AdminWorkTab = {
  id: string;
  path: string;
  title: string;
  pinned: boolean;
  lastAccessAt: number;
};

type AdminWorkTabsState = {
  tabs: AdminWorkTab[];
  activeTabId: string | null;
  upsertTab: (pathname: string, search: string, title: string) => void;
  setActiveTab: (id: string) => void;
  closeTab: (id: string) => string | null;
  closeOtherTabs: (id: string) => void;
  closeTabsToRight: (id: string) => void;
  togglePinTab: (id: string) => void;
};

function trimTabs(tabs: AdminWorkTab[], activeId: string | null): AdminWorkTab[] {
  let next = [...tabs];
  while (next.length > ADMIN_WORK_TABS_MAX) {
    const candidates = next
      .filter((t) => !t.pinned && t.id !== activeId)
      .sort((a, b) => a.lastAccessAt - b.lastAccessAt);
    if (candidates.length === 0) break;
    next = next.filter((t) => t.id !== candidates[0].id);
  }
  return next;
}

export const useAdminWorkTabsStore = create<AdminWorkTabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      upsertTab: (pathname, search, title) => {
        const fullPath = normalizeAdminTabPath(pathname, search);
        const id = adminTabPathKey(fullPath);
        const now = Date.now();
        set((state) => {
          const existing = state.tabs.find((t) => t.id === id);
          const nextTab: AdminWorkTab = existing
            ? { ...existing, path: fullPath, title: title.trim() || existing.title, lastAccessAt: now }
            : { id, path: fullPath, title: title.trim() || fullPath, pinned: false, lastAccessAt: now };
          const tabs = trimTabs(
            existing ? state.tabs.map((t) => (t.id === id ? nextTab : t)) : [...state.tabs, nextTab],
            id,
          );
          return { tabs, activeTabId: id };
        });
      },

      setActiveTab: (id) => {
        set((state) => {
          const tab = state.tabs.find((t) => t.id === id);
          if (!tab) return state;
          return {
            activeTabId: id,
            tabs: state.tabs.map((t) => (t.id === id ? { ...t, lastAccessAt: Date.now() } : t)),
          };
        });
      },

      closeTab: (id) => {
        const state = get();
        const idx = state.tabs.findIndex((t) => t.id === id);
        if (idx < 0) return null;
        const closing = state.tabs[idx];
        if (closing.pinned) return null;

        const wasActive = state.activeTabId === id;
        const nextTabs = state.tabs.filter((t) => t.id !== id);
        if (!wasActive) {
          set({ tabs: nextTabs });
          return null;
        }
        const neighbor = nextTabs[Math.min(idx, nextTabs.length - 1)] ?? nextTabs[nextTabs.length - 1];
        set({ tabs: nextTabs, activeTabId: neighbor?.id ?? null });
        return neighbor?.path ?? null;
      },

      closeOtherTabs: (id) => {
        set((state) => ({
          tabs: state.tabs.filter((t) => t.id === id || t.pinned),
          activeTabId: id,
        }));
      },

      closeTabsToRight: (id) => {
        set((state) => {
          const idx = state.tabs.findIndex((t) => t.id === id);
          if (idx < 0) return state;
          const keep = state.tabs.slice(0, idx + 1);
          const droppedActive = !keep.some((t) => t.id === state.activeTabId);
          return {
            tabs: keep,
            activeTabId: droppedActive ? id : state.activeTabId,
          };
        });
      },

      togglePinTab: (id) => {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)),
        }));
      },

    }),
    {
      name: ADMIN_WORK_TABS_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ tabs: state.tabs, activeTabId: state.activeTabId }),
    },
  ),
);

/** 根据当前路由同步标签（URL 为唯一真相） */
export function syncAdminWorkTabFromLocation(
  pathname: string,
  search: string,
  title: string,
): { path: string; activeId: string | null } | null {
  if (!shouldTrackAdminWorkTab(pathname)) return null;
  const path = normalizeAdminTabPath(pathname, search);
  useAdminWorkTabsStore.getState().upsertTab(pathname, search, title);
  return { path, activeId: adminTabPathKey(path) };
}
