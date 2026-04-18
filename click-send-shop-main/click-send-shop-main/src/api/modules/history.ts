import { get, post, del } from "../request";
import type { PaginatedData } from "@/types/common";
import type { HistoryItem } from "@/types/history";

export function getHistory(page = 1, pageSize = 20) {
  return get<PaginatedData<HistoryItem>>("/history", {
    page: String(page),
    pageSize: String(pageSize),
  });
}

export function addHistory(product_id: string) {
  return post<{ id: string }>("/history", { product_id });
}

export function clearHistory() {
  return del<void>("/history");
}
