import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isLoggedIn } from "@/utils/token";
import * as historyService from "@/services/historyService";
import type { Product } from "@/types/product";

interface HistoryStore {
  history: Product[];
  loading: boolean;
  addToHistory: (product: Product) => void;
  loadHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      history: [],
      loading: false,

      addToHistory: (product) => {
        const current = get().history.filter((p) => p.id !== product.id);
        set({ history: [product, ...current].slice(0, 50) });
        if (isLoggedIn()) {
          historyService.addHistoryItem(product.id).catch(() => {});
        }
      },

      loadHistory: async () => {
        if (!isLoggedIn()) return;
        set({ loading: true });
        try {
          const data = await historyService.fetchHistory(1, 50);
          set({ history: data.list.map((item) => item.product), loading: false });
        } catch (e) {
          set({ loading: false });
          throw e;
        }
      },

      clearHistory: async () => {
        const prev = get().history;
        set({ history: [] });
        if (isLoggedIn()) {
          historyService.clearHistoryRemote().catch(() => {
            set({ history: prev });
          });
        }
      },
    }),
    { name: "history-storage", partialize: (s) => ({ history: s.history }) }
  )
);
