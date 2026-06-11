import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AdminDraftRecord<T = unknown> = {
  tabId: string;
  value: T;
  baseline: string;
  dirty: boolean;
  updatedAt: number;
};

type AdminDraftState = {
  drafts: Record<string, AdminDraftRecord>;
  saveDraft: <T>(tabId: string, value: T, baseline: string) => void;
  clearDraft: (tabId: string) => void;
  clearDrafts: (tabIds: string[]) => void;
};

export const useAdminDraftStore = create<AdminDraftState>()(
  persist(
    (set) => ({
      drafts: {},

      saveDraft: (tabId, value, baseline) => {
        if (!tabId) return;
        set((state) => ({
          drafts: {
            ...state.drafts,
            [tabId]: {
              tabId,
              value,
              baseline,
              dirty: true,
              updatedAt: Date.now(),
            },
          },
        }));
      },

      clearDraft: (tabId) => {
        if (!tabId) return;
        set((state) => {
          if (!state.drafts[tabId]) return state;
          const next = { ...state.drafts };
          delete next[tabId];
          return { drafts: next };
        });
      },

      clearDrafts: (tabIds) => {
        const ids = new Set(tabIds.filter(Boolean));
        if (!ids.size) return;
        set((state) => {
          let changed = false;
          const next = { ...state.drafts };
          for (const id of ids) {
            if (next[id]) {
              delete next[id];
              changed = true;
            }
          }
          return changed ? { drafts: next } : state;
        });
      },
    }),
    {
      name: "admin.formDrafts.v1",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ drafts: state.drafts }),
    },
  ),
);

export function clearAdminDraft(tabId: string) {
  useAdminDraftStore.getState().clearDraft(tabId);
}

export function clearAdminDrafts(tabIds: string[]) {
  useAdminDraftStore.getState().clearDrafts(tabIds);
}
