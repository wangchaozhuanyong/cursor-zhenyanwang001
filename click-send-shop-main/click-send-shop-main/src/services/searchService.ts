import * as searchApi from "@/api/modules/search";
import type { HotSearchTerm, SearchSuggestion } from "@/types/search";
import { getAnonymousId, getSessionId } from "@/services/analyticsService";

export async function fetchHotSearchTerms(limit = 10): Promise<HotSearchTerm[]> {
  const res = await searchApi.getHotSearchTerms(limit);
  return Array.isArray(res.data) ? res.data : [];
}

export async function fetchSearchSuggestions(keyword: string, limit = 8): Promise<SearchSuggestion[]> {
  const res = await searchApi.getSearchSuggestions(keyword, limit);
  return Array.isArray(res.data) ? res.data : [];
}

export async function trackSearchKeyword(keyword: string, resultCount?: number): Promise<void> {
  await searchApi.trackSearchKeyword(keyword, resultCount, {
    session_id: getSessionId(),
    anonymous_id: getAnonymousId(),
  });
}
