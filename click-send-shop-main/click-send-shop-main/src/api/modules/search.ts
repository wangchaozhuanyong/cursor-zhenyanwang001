import { get, post } from "@/api/request";
import type { HotSearchTerm, SearchSuggestion } from "@/types/search";

export function getHotSearchTerms(limit = 10) {
  return get<HotSearchTerm[]>("/search/hot", { limit });
}

export function getSearchSuggestions(keyword: string, limit = 8) {
  return get<SearchSuggestion[]>("/search/suggest", { keyword, limit });
}

export function trackSearchKeyword(keyword: string, result_count?: number) {
  return post<null>("/search/track", { keyword, result_count });
}

