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

export type AdminWorkTabUpsertResult =
  | { ok: true; path: string; activeId: string }
  | { ok: false; path: string; activeId: string; reason: "limit"; max: number };

type AdminWorkTabsState = {
  tabs: AdminWorkTab[];
  activeTabId: string | null;
  lastLimitNoticeAt: number | null;
  consumeLimitNotice: () => void;
  canOpenTab: (pathname: string, search?: string) => boolean;
  upsertTab: (pathname: string, search: string, title: string) => AdminWorkTabUpsertResult;
  updateTabTitle: (pathname: string, search: string, title: string) => void;
  setActiveTab: (id: string) => void;
  closeTab: (id: string) => string | null;
  closeOtherTabs: (id: string) => void;
  closeTabsToRight: (id: string) => void;
  togglePinTab: (id: string) => void;
};

export const useAdminWorkTabsStore = create<AdminWorkTabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      lastLimitNoticeAt: null,

      consumeLimitNotice: () => set({ lastLimitNoticeAt: null }),

      canOpenTab: (pathname, search = "") => {
        const fullPath = normalizeAdminTabPath(pathname, search);
        const id = adminTabPathKey(fullPath);
        const state = get();
        return Boolean(state.tabs.find((t) => t.id === id)) || state.tabs.length < ADMIN_WORK_TABS_MAX;
      },

      upsertTab: (pathname, search, title) => {
        const fullPath = normalizeAdminTabPath(pathname, search);
        const id = adminTabPathKey(fullPath);
        const now = Date.now();
        const state = get();
        const existing = state.tabs.find((t) => t.id === id);
        if (!existing && state.tabs.length >= ADMIN_WORK_TABS_MAX) {
          set({ lastLimitNoticeAt: now });
          return { ok: false, path: fullPath, activeId: state.activeTabId ?? id, reason: "limit", max: ADMIN_WORK_TABS_MAX };
        }

        const nextTab: AdminWorkTab = existing
          ? { ...existing, path: fullPath, title: title.trim() || existing.title, lastAccessAt: now }
          : { id, path: fullPath, title: title.trim() || fullPath, pinned: false, lastAccessAt: now };
        set((current) => ({
          tabs: existing ? current.tabs.map((t) => (t.id === id ? nextTab : t)) : [...current.tabs, nextTab],
          activeTabId: id,
        }));
        return { ok: true, path: fullPath, activeId: id };
      },

      updateTabTitle: (pathname, search, title) => {
        const fullPath = normalizeAdminTabPath(pathname, search);
        const id = adminTabPathKey(fullPath);
        const trimmed = title.trim();
        if (!trimmed) return;
        set((state) => {
          const tab = state.tabs.find((t) => t.id === id);
          if (!tab || tab.title === trimmed) return state;
          return {
            tabs: state.tabs.map((t) => (t.id === id ? { ...t, title: trimmed } : t)),
          };
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
): AdminWorkTabUpsertResult | null {
  if (!shouldTrackAdminWorkTab(pathname)) return null;
  return useAdminWorkTabsStore.getState().upsertTab(pathname, search, title);
}
