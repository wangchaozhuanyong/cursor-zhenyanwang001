import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, Package, Search as SearchIcon, X } from "lucide-react";
import { STORE_COPY } from "@/constants/storeCopy";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { useClientDesignStyle } from "@/modules/storefront-v2/design/useClientDesignStyle";
import { useGoBack } from "@/hooks/useGoBack";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { cn } from "@/lib/utils";
import { getStoreHeaderSurfaceClass } from "@/utils/storeHeaderSurface";
import { useProductStore } from "@/stores/useProductStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
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
import type { Product } from "@/types/product";

const HISTORY_KEY = "search_history";
const MAX_HISTORY = 10;
const MAX_HOT_TERMS = 10;
const PRIORITY_HOT_TERMS = ["正品香烟", "工作签证", "商业装修", "正品槟榔"];
const FALLBACK_HOT_TERMS = [...PRIORITY_HOT_TERMS, "礼盒", "会员价", "本周热销", "RM 99 以下", "东马可送", "积分兑换"];

function normalizeHotTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ");
}

function buildHotTermLabels(terms: HotSearchTerm[]): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  const pushTerm = (term: string) => {
    const label = normalizeHotTerm(term);
    const key = label.toLocaleLowerCase();
    if (!label || seen.has(key)) return;
    seen.add(key);
    labels.push(label);
  };

  PRIORITY_HOT_TERMS.forEach(pushTerm);
  const rankedTerms = terms.length > 0 ? terms.map((term) => term.keyword) : FALLBACK_HOT_TERMS;
  rankedTerms.forEach(pushTerm);
  return labels.slice(0, MAX_HOT_TERMS);
}

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
  const navigate = useNavigate();
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
  const [submittedQuery, setSubmittedQuery] = useState(initialKeyword);
  const [hotTerms, setHotTerms] = useState<HotSearchTerm[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
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
  const historyProducts = useHistoryStore((state) => state.history);
  const loadHistory = useHistoryStore((state) => state.loadHistory);
  const showFullSkeleton = loading && products.length === 0;
  const showSoftRefreshing = listRefreshing && products.length > 0;

  useEffect(() => {
    const keyword = searchParams.get("keyword")?.trim() || "";
    setQuery(keyword);
    setSubmittedQuery(keyword);
    if (keyword) setSearchAttribution(keyword);
  }, [searchParams]);

  useEffect(() => {
    fetchHotSearchTerms(10)
      .then(setHotTerms)
      .catch(() => setHotTerms([]));
  }, []);

  useEffect(() => {
    setSearchHistory(getHistory());
  }, []);

  useEffect(() => {
    loadHistory().catch(() => {});
  }, [loadHistory]);

  useEffect(() => {
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    const term = query.trim();
    if (!term || term === submittedQuery) {
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
  }, [query, submittedQuery]);

  useEffect(() => {
    const keyword = submittedQuery.trim();
    if (!keyword) return;
    loadProducts({
      keyword,
      page: 1,
      pageSize: 50,
    });
  }, [loadProducts, submittedQuery]);

  useEffect(() => {
    const pendingKeyword = pendingTrackKeywordRef.current.trim();
    if (!pendingKeyword || pendingKeyword !== submittedQuery.trim()) return;
    if (loading || listRefreshing) return;
    trackSearchKeyword(pendingKeyword, pagination.total).catch(() => {});
    pendingTrackKeywordRef.current = "";
  }, [listRefreshing, loading, pagination.total, submittedQuery]);

  const addToHistory = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const newList = [trimmed, ...getHistory().filter((item) => item !== trimmed)].slice(0, MAX_HISTORY);
    saveHistory(newList);
    setSearchHistory(newList);
  }, []);

  const clearSearchHistory = useCallback(() => {
    saveHistory([]);
    setSearchHistory([]);
  }, []);

  const commitSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("keyword", trimmed);
    setSearchParams(nextParams, { replace: true });
    setQuery(trimmed);
    setSubmittedQuery(trimmed);
    setSuggestions([]);
    addToHistory(trimmed);
    setSearchAttribution(trimmed);
    pendingTrackKeywordRef.current = trimmed;
  }, [addToHistory, searchParams, setSearchParams]);

  const clearSearch = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("keyword");
    setSearchParams(nextParams, { replace: true });
    setQuery("");
    setSubmittedQuery("");
    setSuggestions([]);
  }, [searchParams, setSearchParams]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (!value.trim() && submittedQuery) clearSearch();
  }, [clearSearch, submittedQuery]);

  const handleSubmit = useCallback(() => {
    commitSearch(query);
  }, [commitSearch, query]);

  const hotTermLabels = useMemo(() => buildHotTermLabels(hotTerms), [hotTerms]);
  const shouldShowSuggestions = query.trim().length > 0 && suggestions.length > 0 && query.trim() !== submittedQuery.trim();
  const shouldShowDiscovery = !submittedQuery.trim();
  const siteName = siteInfo.siteName || STORE_COPY.brandName;

  return (
    <div
      className={cn(
        "store-page-shell store-v12-page store-search-v12-page store-search-page store-client-search-page store-bottom-safe text-[var(--theme-text)]",
        clientStyle === "black_gold"
          ? "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-surface))_0%,var(--theme-bg)_22rem,var(--theme-bg)_100%)]"
          : clientStyle === "deep_enterprise"
            ? "bg-[linear-gradient(180deg,#101B34_0%,#101B34_6rem,color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-surface))_6rem,var(--theme-bg)_24rem,var(--theme-bg)_100%)]"
            : "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--theme-primary)_6%,var(--theme-surface))_0%,var(--theme-bg)_22rem,color-mix(in_srgb,var(--theme-primary)_3%,var(--theme-bg))_100%)]",
      )}
      data-storefront-client-style={clientStyle}
    >
      <SeoHead
        title={`搜索｜${siteName}`}
        description={`查看${siteName}站内搜索，快速查找相关服务、商品和帮助内容。`}
        canonical={buildCanonical("/search")}
        robots="noindex,follow"
      />
      <header className={cn("store-client-search-header sticky top-0 z-header pt-[env(safe-area-inset-top,0px)]", surfaceClass)}>
        <div className="mx-auto w-full max-w-screen-xl px-[var(--store-header-x)]">
          <div className="store-client-search-line">
            <div className="store-client-search-input">
              <SearchIcon size={17} aria-hidden />
              <input
                type="search"
                value={query}
                autoFocus
                placeholder={STORE_COPY.searchPlaceholder}
                onChange={(event) => handleQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
                aria-label={STORE_COPY.searchPlaceholder}
              />
              {query ? (
                <UnifiedButton type="button" onClick={clearSearch} className="store-client-search-clear" aria-label="清空搜索">
                  <X size={14} aria-hidden />
                </UnifiedButton>
              ) : null}
            </div>
            <UnifiedButton type="button" onClick={goBack} className="store-client-search-cancel">
              取消
            </UnifiedButton>
          </div>
        </div>
      </header>

      <main className="store-client-search-body mx-auto max-w-screen-xl px-[var(--store-page-x)] py-[var(--store-page-y)] md:px-6 md:py-6">
        {shouldShowSuggestions ? (
          <SearchListSection title="搜索建议">
            {suggestions.map((item) => (
              <SearchSuggestionRow
                key={`${item.source}-${item.keyword}`}
                label={item.keyword}
                meta={item.source === "term" ? "热搜" : "商品"}
                onClick={() => commitSearch(item.keyword)}
              />
            ))}
          </SearchListSection>
        ) : null}

        {shouldShowDiscovery ? (
          <>
            <section className="store-client-search-section" aria-labelledby="client-hot-search-title">
              <h2 id="client-hot-search-title" className="store-client-search-group-label">热门搜索</h2>
              <div className="store-client-search-chip-grid">
                {hotTermLabels.map((term) => (
                  <UnifiedButton key={term} type="button" onClick={() => commitSearch(term)} className="store-client-search-chip">
                    {term}
                  </UnifiedButton>
                ))}
              </div>
            </section>

            {searchHistory.length > 0 ? (
              <SearchListSection
                title="最近搜索"
                action={
                  <UnifiedButton type="button" onClick={clearSearchHistory} className="store-client-search-section-action">
                    清空
                  </UnifiedButton>
                }
              >
                {searchHistory.slice(0, 5).map((term) => (
                  <SearchSuggestionRow
                    key={term}
                    label={term}
                    meta="历史"
                    onClick={() => commitSearch(term)}
                  />
                ))}
              </SearchListSection>
            ) : null}

            <SearchListSection title="最近浏览">
              {historyProducts.length > 0 ? (
                historyProducts.slice(0, 3).map((product) => (
                  <RecentProductRow
                    key={product.id}
                    product={product}
                    onClick={() => navigate(`/product/${product.id}`)}
                  />
                ))
              ) : (
                <div className="store-client-search-empty-row">暂无最近浏览</div>
              )}
            </SearchListSection>

          </>
        ) : (
          <>
            <div className="store-client-search-results-head">
              <div>
                <span>搜索结果</span>
                <h1>“{submittedQuery}”</h1>
              </div>
              <UnifiedButton type="button" onClick={clearSearch}>
                清空
              </UnifiedButton>
            </div>

            {error ? (
              <div className={`mb-4 p-3 text-center text-sm ${THEME_ALERT_ERROR_SOFT}`}>
                {error}
              </div>
            ) : null}

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
                  description="可以换个关键词，或清空搜索后查看热门搜索。"
                  action={
                    <ClientButton type="button" variant="secondary" size="sm" onClick={clearSearch}>
                      清空搜索
                    </ClientButton>
                  }
                />
              }
            />
          </>
        )}
      </main>
    </div>
  );
}

function SearchListSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="store-client-search-section" aria-labelledby={`client-search-section-${title}`}>
      <div className="store-client-search-section-head">
        <h2 id={`client-search-section-${title}`} className="store-client-search-group-label">{title}</h2>
        {action}
      </div>
      <div className="store-client-search-list">{children}</div>
    </section>
  );
}

function SearchSuggestionRow({ label, meta, onClick }: { label: string; meta: string; onClick: () => void }) {
  return (
    <UnifiedButton type="button" onClick={onClick} className="store-client-search-row">
      <span className="store-client-search-row-icon"><SearchIcon size={17} aria-hidden /></span>
      <span className="store-client-search-row-text">{label}</span>
      <span className="store-client-search-row-side">{meta}</span>
    </UnifiedButton>
  );
}

function RecentProductRow({ product, onClick }: { product: Product; onClick: () => void }) {
  return (
    <UnifiedButton type="button" onClick={onClick} className="store-client-search-row">
      <span className="store-client-search-row-icon"><Package size={17} aria-hidden /></span>
      <span className="store-client-search-row-text">
        <strong>{product.name}</strong>
      </span>
      <span className="store-client-search-row-side">
        <ChevronRight size={15} aria-hidden />
      </span>
    </UnifiedButton>
  );
}
