export interface HotSearchTerm {
  keyword: string;
  search_count: number;
  result_count: number;
  last_searched_at?: string | null;
}

export interface SearchSuggestion {
  keyword: string;
  source: "term" | "product";
  search_count: number;
}
