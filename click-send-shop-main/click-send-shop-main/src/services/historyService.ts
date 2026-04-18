import * as historyApi from "@/api/modules/history";
import type { PaginatedData } from "@/types/common";
import type { HistoryItem } from "@/types/history";

export async function fetchHistory(page = 1, pageSize = 20) {
  const res = await historyApi.getHistory(page, pageSize);
  return res.data as PaginatedData<HistoryItem>;
}

export async function addHistoryItem(productId: string) {
  return historyApi.addHistory(productId);
}

export async function clearHistoryRemote() {
  return historyApi.clearHistory();
}
