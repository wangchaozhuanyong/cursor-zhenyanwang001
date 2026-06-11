export interface HotSearchTerm {
  id?: string;
  keyword: string;
  search_count: number;
  result_count: number;
  last_searched_at?: string | null;
  source?: "auto" | "manual";
  is_pinned?: boolean;
  is_hidden?: boolean;
  sort_order?: number;
  remark?: string;
}

export interface SearchSuggestion {
  keyword: string;
  source: "term" | "product";
  search_count: number;
}
