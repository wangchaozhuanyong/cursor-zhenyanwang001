import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, Search as SearchIcon, X } from "lucide-react";
import ProductCoverImage from "@/components/ProductCoverImage";
import { STORE_COPY } from "@/constants/storeCopy";
import { useClientDesignStyle } from "@/modules/storefront-v2/design/useClientDesignStyle";
import StorefrontPrice from "@/modules/storefront-v2/components/StorefrontPrice";
import { buildProductCardV2Model } from "@/modules/storefront-v2/product/productCardV2Model";
import { useGoBack } from "@/hooks/useGoBack";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { cn } from "@/lib/utils";
import { useProductStore } from "@/stores/useProductStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import SilkProductGrid from "@/components/motion/SilkProductGrid";
import { fetchHotSearchTerms, fetchSearchSuggestions, trackSearchKeyword } from "@/services/searchService";
import type { HotSearchTerm, SearchSuggestion } from "@/types/search";
import { THEME_ALERT_ERROR_SOFT } from "@/utils/themeVisuals";
import SeoHead from "@/components/SeoHead";
import { buildCanonical } from "@/utils/seo";
import { setSearchAttribution } from "@/services/analyticsService";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { appendThemePreviewParams } from "@/utils/themePreviewParams";
import type { Product, ProductListParams } from "@/types/product";

const HISTORY_KEY = "search_history";
const MAX_HISTORY = 10;
const MAX_HOT_TERMS = 10;
const FALLBACK_HOT_TERMS = ["新品", "热销", "优惠券", "礼盒"];

function normalizeHotTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ");
}

function buildHotTermLabels(terms: HotSearchTerm[]): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  const pushTerm = (term: string) => {
    const label = normalizeHotTerm(term);
    const key = label.toLocaleLowerCase();
    if (/^\d+$/.test(label)) return;
    if (!label || seen.has(key)) return;
    seen.add(key);
    labels.push(label);
  };

  if (terms.length > 0) {
    terms.map((term) => term.keyword).forEach(pushTerm);
  }
  FALLBACK_HOT_TERMS.forEach(pushTerm);
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

function uniqueProductsById(items: Product[], limit: number) {
  const seen = new Set<string>();
  const result: Product[] = [];
  items.forEach((item) => {
    if (!item?.id || seen.has(item.id)) return;
    seen.add(item.id);
    result.push(item);
  });
  return result.slice(0, limit);
}

export default function Search() {
  const goBack = useGoBack("/");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const clientStyle = useClientDesignStyle();
  const siteInfo = useSiteInfo();
  const siteCapabilities = useSiteCapabilities();
  const productGridClass = "sf-next-product-grid grid grid-cols-2 gap-x-5 gap-y-8 pt-1 md:grid-cols-3 xl:grid-cols-4";
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
  const [searchHistory, setSearchHistory] = useState<string[]>(() => (typeof window === "undefined" ? [] : getHistory()));
  const [readySearchQueryKey, setReadySearchQueryKey] = useState("");
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingTrackKeywordRef = useRef(initialKeyword);
  const latestSearchQueryKeyRef = useRef("");

  const {
    products,
    pagination,
    loading,
    listRefreshing,
    error,
    hotProducts,
    newProducts,
    recommendedProducts,
    loadProducts,
    loadHomeData,
  } = useProductStore();
  const historyProducts = useHistoryStore((state) => state.history);
  const loadHistory = useHistoryStore((state) => state.loadHistory);
  const shouldShowDiscovery = !submittedQuery.trim();
  const hasDiscoveryProducts =
    hotProducts.length > 0 || newProducts.length > 0 || recommendedProducts.length > 0;
  const recentBrowseProducts = useMemo(() => historyProducts.slice(0, 3), [historyProducts]);
  const recommendedBrowseProducts = useMemo(
    () => uniqueProductsById([...hotProducts, ...newProducts, ...recommendedProducts], 3),
    [hotProducts, newProducts, recommendedProducts],
  );
  const searchProductParams = useMemo<ProductListParams | null>(() => {
    const keyword = submittedQuery.trim();
    if (!keyword) return null;
    return {
      keyword,
      page: 1,
      pageSize: 50,
    };
  }, [submittedQuery]);

  const searchQueryKey = useMemo(() => {
    if (!searchProductParams) return "empty-search";
    return JSON.stringify(
      Object.entries(searchProductParams)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .sort(([a], [b]) => a.localeCompare(b)),
    );
  }, [searchProductParams]);
  const searchQueryReady = !searchProductParams || readySearchQueryKey === searchQueryKey;
  const visibleProducts = searchQueryReady ? products : [];
  const showFullSkeleton = Boolean(searchProductParams) && (!searchQueryReady || (loading && visibleProducts.length === 0));
  const showSoftRefreshing = searchQueryReady && listRefreshing && visibleProducts.length > 0;

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
    loadHistory().catch(() => {});
  }, [loadHistory]);

  useEffect(() => {
    if (!shouldShowDiscovery) return;
    void loadHomeData({ background: hasDiscoveryProducts });
  }, [hasDiscoveryProducts, loadHomeData, shouldShowDiscovery]);

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
    if (!searchProductParams) return;

    let cancelled = false;
    const queryKey = searchQueryKey;
    latestSearchQueryKeyRef.current = queryKey;
    setReadySearchQueryKey("");

    void loadProducts(searchProductParams).finally(() => {
      if (!cancelled && latestSearchQueryKeyRef.current === queryKey) {
        setReadySearchQueryKey(queryKey);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadProducts, searchProductParams, searchQueryKey]);

  useEffect(() => {
    const pendingKeyword = pendingTrackKeywordRef.current.trim();
    if (!pendingKeyword || pendingKeyword !== submittedQuery.trim()) return;
    if (!searchQueryReady || loading || listRefreshing) return;
    trackSearchKeyword(pendingKeyword, pagination.total).catch(() => {});
    pendingTrackKeywordRef.current = "";
  }, [listRefreshing, loading, pagination.total, searchQueryReady, submittedQuery]);

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

  const handleFormSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSubmit();
  }, [handleSubmit]);

  const hotTermLabels = useMemo(() => buildHotTermLabels(hotTerms), [hotTerms]);
  const shouldShowSuggestions = query.trim().length > 0 && suggestions.length > 0 && query.trim() !== submittedQuery.trim();
  const showDiscoveryProductsLoading = shouldShowDiscovery && loading && recentBrowseProducts.length === 0 && recommendedBrowseProducts.length === 0;
  const siteName = siteInfo.siteName || STORE_COPY.brandName;

  return (
    <div
      className="sf-next-page-shell sf-next-route-page sf-next-search-page sf-next-bottom-safe text-[var(--theme-text)]"
      data-storefront-client-style={clientStyle}
    >
      <SeoHead
        title={`搜索｜${siteName}`}
        description={`查看${siteName}站内搜索，快速查找相关服务、商品和帮助内容。`}
        canonical={buildCanonical("/search")}
        robots="noindex,follow"
      />
      <header className="sf-next-search-header sticky top-0 z-header pt-[env(safe-area-inset-top,0px)]">
        <form className="sf-next-search-bar mx-auto w-full max-w-screen-xl" onSubmit={handleFormSubmit} role="search">
          <UnifiedButton type="button" onClick={goBack} className="sf-next-search-nav-button" aria-label="返回">
            <ArrowLeft size={22} aria-hidden />
          </UnifiedButton>
          <label className="sr-only" htmlFor="store-search-input">搜索商品</label>
          <div className="sf-next-search-input">
            <SearchIcon size={19} aria-hidden />
            <input
              id="store-search-input"
              type="search"
              value={query}
              autoFocus
              placeholder="搜索商品"
              onChange={(event) => handleQueryChange(event.target.value)}
              aria-label={STORE_COPY.searchPlaceholder}
            />
            {query ? (
              <UnifiedButton type="button" onClick={clearSearch} className="sf-next-search-clear" aria-label="清空搜索">
                <X size={14} aria-hidden />
              </UnifiedButton>
            ) : null}
          </div>
          <UnifiedButton type="submit" className="sf-next-search-nav-button" aria-label="搜索">
            <SearchIcon size={22} aria-hidden />
          </UnifiedButton>
        </form>
      </header>

      <main className="sf-next-search-body mx-auto w-full max-w-screen-xl">
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
            <SearchHistorySection
              items={searchHistory}
              onClear={clearSearchHistory}
              onSelect={commitSearch}
            />

            <SearchListSection title="热门搜索">
              {hotTermLabels.slice(0, 4).map((term, index) => (
                <SearchSuggestionRow
                  key={`hot-term-${index}`}
                  label={term}
                  index={index + 1}
                  onClick={() => commitSearch(term)}
                />
              ))}
            </SearchListSection>

            <RecentBrowseSection
              products={recentBrowseProducts}
              onOpen={(product) => navigate(appendThemePreviewParams(buildProductCardV2Model(product).href))}
            />

            {recentBrowseProducts.length === 0 ? (
              <SearchProductStripSection
                title="推荐浏览"
                products={recommendedBrowseProducts}
                loading={showDiscoveryProductsLoading}
                onOpen={(product) => navigate(appendThemePreviewParams(buildProductCardV2Model(product).href))}
              />
            ) : null}
          </>
        ) : (
          <>
            <div className="sf-next-search-results-head">
              <div>
                <span>搜索结果</span>
                <h1>{submittedQuery}</h1>
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
              products={visibleProducts}
              className={productGridClass}
              skeletonCount={6}
              siteContext={productCardSiteContext}
              itemKeyPrefix={`search:${submittedQuery.trim()}`}
              showFullSkeleton={showFullSkeleton}
              showSoftRefreshing={showSoftRefreshing}
              emptyState={
                <section className="sf-next-state-panel sf-next-search-empty">
                  <span className="sf-next-state-panel__icon" aria-hidden>
                    <SearchIcon size={28} />
                  </span>
                  <h2>没有找到相关商品</h2>
                  <p>可以换个关键词，或清空搜索后查看热门搜索。</p>
                  <UnifiedButton type="button" onClick={clearSearch} className="sf-next-state-panel__primary">
                    <X size={17} aria-hidden />
                    清空搜索
                  </UnifiedButton>
                </section>
              }
            />
          </>
        )}
      </main>
    </div>
  );
}

function SearchHistorySection({
  items,
  onClear,
  onSelect,
}: {
  items: string[];
  onClear: () => void;
  onSelect: (term: string) => void;
}) {
  if (!items.length) return null;
  return (
    <section className="sf-next-search-section" aria-labelledby="client-search-history-title">
      <div className="sf-next-search-section-head">
        <h2 id="client-search-history-title" className="sf-next-search-group-label">搜索历史</h2>
        <UnifiedButton type="button" onClick={onClear} className="sf-next-search-section-action">
          清空
        </UnifiedButton>
      </div>
      <div className="sf-next-search-history-chips">
        {items.slice(0, 4).map((term) => (
          <UnifiedButton key={term} type="button" onClick={() => onSelect(term)} className="sf-next-search-chip">
            {term}
          </UnifiedButton>
        ))}
      </div>
    </section>
  );
}

function SearchListSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="sf-next-search-section" aria-labelledby={`client-search-section-${title}`}>
      <div className="sf-next-search-section-head">
        <h2 id={`client-search-section-${title}`} className="sf-next-search-group-label">{title}</h2>
        {action}
      </div>
      <div className="sf-next-search-list">{children}</div>
    </section>
  );
}

function SearchSuggestionRow({
  label,
  meta,
  index,
  onClick,
}: {
  label: string;
  meta?: string;
  index?: number;
  onClick: () => void;
}) {
  return (
    <UnifiedButton type="button" onClick={onClick} className="sf-next-search-row">
      <span className="sf-next-search-row-rank">{index ? String(index).padStart(2, "0") : <SearchIcon size={18} aria-hidden />}</span>
      <span className={cn("sf-next-search-row-text", index && index <= 2 && "is-emphasis")}>{label}</span>
      <span className="sf-next-search-row-side">
        {meta || <ChevronRight size={18} aria-hidden />}
      </span>
    </UnifiedButton>
  );
}

function RecentBrowseSection({
  products,
  onOpen,
}: {
  products: Product[];
  onOpen: (product: Product) => void;
}) {
  if (products.length === 0) return null;
  return (
    <section className="sf-next-search-section" aria-labelledby="client-search-recent-title">
      <div className="sf-next-search-section-head">
        <h2 id="client-search-recent-title" className="sf-next-search-group-label">最近浏览</h2>
      </div>
      <div className="sf-next-search-recent-grid">
        {products.map((product) => (
          <RecentProductCard key={product.id} product={product} onOpen={() => onOpen(product)} />
        ))}
      </div>
    </section>
  );
}

function SearchProductStripSection({
  title,
  products,
  loading,
  onOpen,
}: {
  title: string;
  products: Product[];
  loading: boolean;
  onOpen: (product: Product) => void;
}) {
  if (products.length === 0 && !loading) return null;
  return (
    <section className="sf-next-search-section" aria-labelledby={`client-search-product-strip-${title}`}>
      <div className="sf-next-search-section-head">
        <h2 id={`client-search-product-strip-${title}`} className="sf-next-search-group-label">{title}</h2>
      </div>
      <div className="sf-next-search-recent-grid" aria-busy={loading || undefined}>
        {products.length > 0
          ? products.map((product) => (
            <RecentProductCard key={product.id} product={product} onOpen={() => onOpen(product)} />
          ))
          : Array.from({ length: 3 }).map((_, index) => (
            <span key={`search-product-strip-skeleton-${index}`} className="sf-next-search-recent-card sf-next-search-recent-card--skeleton" aria-hidden>
              <span className="sf-next-search-recent-card__media" />
              <span className="sf-next-search-recent-card__skeleton-line" />
              <span className="sf-next-search-recent-card__skeleton-price" />
            </span>
          ))}
      </div>
    </section>
  );
}

function RecentProductCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  const vm = buildProductCardV2Model(product);
  return (
    <UnifiedButton type="button" className="sf-next-search-recent-card" onClick={onOpen}>
      <span className="sf-next-search-recent-card__media">
        <ProductCoverImage
          url={vm.imageUrl}
          alt={vm.imageAlt}
          className="h-full w-full"
          imgClassName="h-full w-full object-cover"
          loading="lazy"
          sizes="112px"
        />
      </span>
      <span className="sf-next-search-recent-card__name">{vm.name}</span>
      <StorefrontPrice className="sf-next-search-recent-card__price" amount={vm.priceText} originalAmount={vm.originalPriceText} />
    </UnifiedButton>
  );
}
