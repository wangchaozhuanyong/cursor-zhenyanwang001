import { create } from "zustand";
import type { PointsRecord } from "@/types/points";
import * as pointsService from "@/services/pointsService";

interface PointsState {
  balance: number;
  records: PointsRecord[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  setBalance: (balance: number) => void;
  setRecords: (records: PointsRecord[]) => void;
  loadPointsData: () => Promise<void>;
  loadMore: () => Promise<void>;
}

const PAGE_SIZE = 20;

export const usePointsStore = create<PointsState>((set, get) => ({
  balance: 0,
  records: [],
  loading: false,
  loadingMore: false,
  error: null,
  page: 1,
  hasMore: true,

  setBalance: (balance) => set({ balance }),
  setRecords: (records) => set({ records }),

  loadPointsData: async () => {
    set({ loading: true, error: null, page: 1 });
    try {
      const [recordsData, balance] = await Promise.all([
        pointsService.fetchPointsRecords({ page: 1, pageSize: PAGE_SIZE }),
        pointsService.fetchPointsBalance(),
      ]);
      set({
        records: recordsData.list,
        balance,
        loading: false,
        hasMore: recordsData.list.length >= PAGE_SIZE,
      });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "加载积分数据失败",
        loading: false,
      });
    }
  },

  loadMore: async () => {
    const { loadingMore, hasMore, page, records } = get();
    if (loadingMore || !hasMore) return;
    set({ loadingMore: true });
    try {
      const nextPage = page + 1;
      const data = await pointsService.fetchPointsRecords({ page: nextPage, pageSize: PAGE_SIZE });
      set({
        records: [...records, ...data.list],
        page: nextPage,
        hasMore: data.list.length >= PAGE_SIZE,
        loadingMore: false,
      });
    } catch {
      set({ loadingMore: false });
    }
  },
}));
