import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Search as SearchIcon, TrendingUp } from "lucide-react";
import StoreSearchField from "@/components/store/StoreSearchField";
import { STORE_COPY } from "@/constants/storeCopy";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { useClientDesignStyle } from "@/modules/storefront-v2/design/useClientDesignStyle";
import { useGoBack } from "@/hooks/useGoBack";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { cn } from "@/lib/utils";
import { getStoreHeaderSurfaceClass } from "@/utils/storeHeaderSurface";
import { useProductStore } from "@/stores/useProductStore";
import SilkProductGrid from "@/components/motion/SilkProductGrid";
import { fetchHotSearchTerms, fetchSearchSuggestions, trackSearchKeyword } from "@/services/searchService";
import type { HotSearchTerm, SearchSuggestion } from "@/types/search";
import { getProductGridClassName } from "@/utils/productGridClasses";
import { THEME_ALERT_ERROR_SOFT } from "@/utils/themeVisuals";
import SeoHead from "@/components/SeoHead";
import { buildCanonical } from "@/utils/seo";
import { setSearchAttribution } from "@/services/analyticsService";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { ClientButton, EmptyState as ClientEmptyState } from "@/components/client";

const HISTORY_KEY = "search_history";
const MAX_HISTORY = 10;

function getHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(list: string[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
}

export default function Search() {
  const goBack = useGoBack("/");
  const [searchParams, setSearchParams] = useSearchParams();
  const { themeConfig } = useThemeRuntime();
  const clientStyle = useClientDesignStyle();
  const siteInfo = useSiteInfo();
  const siteCapabilities = useSiteCapabilities();
  const surfaceClass = getStoreHeaderSurfaceClass(themeConfig);
  const productGridClass = getProductGridClassName(themeConfig.productCardVariant);
  const productCardSiteContext = useMemo(
    () => ({
      restrictedComplianceEnabled: siteCapabilities.restrictedProductComplianceEnabled,
      siteInfo,
    }),
    [siteCapabilities.restrictedProductComplianceEnabled, siteInfo],
  );
  const initialKeyword = searchParams.get("keyword")?.trim() || "";
  const [query, setQuery] = useState(initialKeyword);
  const [debouncedQuery, setDebouncedQuery] = useState(initialKeyword);
  const [hotTerms, setHotTerms] = useState<HotSearchTerm[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingTrackKeywordRef = useRef(initialKeyword);

  const {
    products,
    pagination,
    loading,
    listRefreshing,
    error,
    loadProducts,
  } = useProductStore();
  const showFullSkeleton = loading && products.length === 0;
  const showSoftRefreshing = listRefreshing && products.length > 0;

  useEffect(() => {
    const keyword = searchParams.get("keyword")?.trim() || "";
    setQuery(keyword);
    setDebouncedQuery(keyword);
    if (keyword) setSearchAttribution(keyword);
  }, [searchParams]);

  useEffect(() => {
    fetchHotSearchTerms(10)
      .then(setHotTerms)
      .catch(() => setHotTerms([]));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    const term = query.trim();
    if (!term) {
      setSuggestions([]);
      return;
    }
    suggestDebounceRef.current = setTimeout(() => {
      fetchSearchSuggestions(term, 8)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 220);
    return () => {
      if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const keyword = debouncedQuery.trim();
    if (!keyword) return;
    loadProducts({
      keyword,
      page: 1,
      pageSize: 50,
    });
  }, [debouncedQuery, loadProducts]);

  useEffect(() => {
    const pendingKeyword = pendingTrackKeywordRef.current.trim();
    const keyword = debouncedQuery.trim();
    const urlKeyword = searchParams.get("keyword")?.trim() || "";
    if (!pendingKeyword || pendingKeyword !== keyword || pendingKeyword !== urlKeyword) return;
    if (loading || listRefreshing) return;
    trackSearchKeyword(pendingKeyword, pagination.total).catch(() => {});
    pendingTrackKeywordRef.current = "";
  }, [debouncedQuery, listRefreshing, loading, pagination.total, searchParams]);

  const addToHistory = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const newList = [trimmed, ...getHistory().filter((h) => h !== trimmed)].slice(0, MAX_HISTORY);
    saveHistory(newList);
  }, []);

  const commitSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("keyword", trimmed);
    setSearchParams(nextParams, { replace: true });
    setQuery(trimmed);
    setDebouncedQuery(trimmed);
    setSuggestions([]);
    addToHistory(trimmed);
    setSearchAttribution(trimmed);
    pendingTrackKeywordRef.current = trimmed;
  }, [addToHistory, searchParams, setSearchParams]);

  const handleSearch = useCallback((val: string) => {
    setQuery(val);
    if (!val.trim()) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("keyword");
      setSearchParams(nextParams, { replace: true });
      setDebouncedQuery("");
      setSuggestions([]);
    }
  }, [searchParams, setSearchParams]);

  const handleSubmit = useCallback(() => {
    if (query.trim()) {
      commitSearch(query.trim());
    }
  }, [query, commitSearch]);

  const shouldShowHotSearch = !debouncedQuery.trim() && !query.trim();
  const shouldShowSuggestions = query.trim().length > 0 && suggestions.length > 0 && query.trim() !== debouncedQuery.trim();
  const siteName = siteInfo.siteName || STORE_COPY.brandName;

  return (
    <div
      className={cn(
        "store-page-shell store-search-page store-bottom-safe text-[var(--theme-text)]",
        clientStyle === "black_gold"
          ? "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-surface))_0%,var(--theme-bg)_22rem,var(--theme-bg)_100%)]"
          : clientStyle === "deep_enterprise"
            ? "bg-[linear-gradient(180deg,#101B34_0%,#101B34_6rem,color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-surface))_6rem,var(--theme-bg)_24rem,var(--theme-bg)_100%)]"
            : "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--theme-primary)_6%,var(--theme-surface))_0%,var(--theme-bg)_22rem,color-mix(in_srgb,var(--theme-primary)_3%,var(--theme-bg))_100%)]",
      )}
      data-storefront-client-style={clientStyle}
    >
      <SeoHead
        title={`搜索结果｜${siteName}`}
        description={`查看${siteName}站内搜索结果，快速查找相关服务、商品和帮助内容。`}
        canonical={buildCanonical("/search")}
        robots="noindex,follow"
      />
      <header
        className={cn(
          "store-search-header sticky top-0 z-header border-b backdrop-blur-xl pt-[env(safe-area-inset-top,0px)]",
          surfaceClass,
        )}
      >
        <div className="mx-auto w-full max-w-screen-xl px-[var(--store-header-x)]">
          <div className="flex h-[var(--store-tab-header-height)] items-center gap-2">
            <UnifiedButton
              type="button"
              onClick={goBack}
              aria-label="返回"
              className="-ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-text)] transition active:scale-95 touch-target"
            >
              <ArrowLeft size={20} strokeWidth={2.25} />
            </UnifiedButton>
            <StoreSearchField
              mode="filter"
              size="compact"
              autoFocus
              placeholder={STORE_COPY.searchPlaceholder}
              value={query}
              onValueChange={handleSearch}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-[var(--store-page-x)] py-[var(--store-page-y)] md:px-6 md:py-6">
        {shouldShowHotSearch && hotTerms.length > 0 && (
          <section className="store-discovery-section mb-6">
            <div className="mb-3 h-1 w-8 rounded-full bg-[var(--theme-primary)]" aria-hidden />
            <h3 className="store-section-title mb-3 flex items-center gap-1.5 text-foreground">
              <TrendingUp size={14} className="text-[var(--theme-primary)]" /> 热门搜索
            </h3>
            <div className="flex flex-wrap gap-2 md:max-w-2xl">
              {hotTerms.map((term) => (
                <UnifiedButton
                  key={term.keyword}
                  type="button"
                  onClick={() => commitSearch(term.keyword)}
                  className="rounded-full border border-[color-mix(in_srgb,var(--theme-primary)_14%,var(--theme-border))] bg-[var(--theme-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-text)] shadow-sm"
                >
                  {term.keyword}
                  <span className="ml-1 text-[10px] text-muted-foreground">{term.search_count}</span>
                </UnifiedButton>
              ))}
            </div>
          </section>
        )}

        {shouldShowSuggestions && (
          <div className="store-suggestion-panel mb-5 overflow-hidden rounded-[1.125rem] border border-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-border))] bg-[var(--theme-surface)] shadow-[0_12px_36px_color-mix(in_srgb,var(--theme-primary)_8%,transparent)]">
            {suggestions.map((item) => (
              <UnifiedButton
                key={`${item.source}-${item.keyword}`}
                type="button"
                onClick={() => commitSearch(item.keyword)}
                className="flex w-full items-center gap-2 border-b border-[var(--theme-border)] px-4 py-3 text-left text-sm text-foreground last:border-0"
              >
                <SearchIcon size={14} className="text-muted-foreground" />
                <span className="flex-1">{item.keyword}</span>
                <span className="text-[10px] text-muted-foreground">
                  {item.source === "term" ? "热搜" : "商品"}
                </span>
              </UnifiedButton>
            ))}
          </div>
        )}

        {error && (
          <div className={`mb-4 p-3 text-center text-sm ${THEME_ALERT_ERROR_SOFT}`}>
            {error}
          </div>
        )}

        {!shouldShowHotSearch && (
          <SilkProductGrid
            products={products}
            className={productGridClass}
            skeletonCount={6}
            siteContext={productCardSiteContext}
            showFullSkeleton={showFullSkeleton}
            showSoftRefreshing={showSoftRefreshing}
            emptyState={
              <ClientEmptyState
                className="store-search-empty"
                title="没有找到相关商品"
                description="可以换个关键词，或清空搜索后查看全部分类。"
                action={
                  <ClientButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const nextParams = new URLSearchParams(searchParams);
                      nextParams.delete("keyword");
                      setSearchParams(nextParams, { replace: true });
                      setQuery("");
                      setDebouncedQuery("");
                      setSuggestions([]);
                    }}
                  >
                    清空搜索
                  </ClientButton>
                }
              />
            }
          />
        )}
      </main>
    </div>
  );
}
