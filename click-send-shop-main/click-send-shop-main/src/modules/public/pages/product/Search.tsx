import { useState, useEffect, useCallback, useRef } from "react";
import PageHeader from "@/components/PageHeader";
import SearchBar from "@/components/SearchBar";
import CategoryTabs from "@/components/CategoryTabs";
import { useProductStore } from "@/stores/useProductStore";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, X } from "lucide-react";

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
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [history, setHistory] = useState<string[]>(getHistory);
  const [showHistory, setShowHistory] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const {
    products,
    categories,
    loading,
    error,
    loadProducts,
    loadCategories,
  } = useProductStore();

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      if (query.trim()) setShowHistory(false);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    loadProducts({
      keyword: debouncedQuery || undefined,
      category_id: activeCat === "all" ? undefined : activeCat,
      page: 1,
      pageSize: 50,
    });
  }, [debouncedQuery, activeCat, loadProducts]);

  const addToHistory = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const newList = [trimmed, ...getHistory().filter((h) => h !== trimmed)].slice(0, MAX_HISTORY);
    saveHistory(newList);
    setHistory(newList);
  }, []);

  const handleSearch = useCallback(
    (val: string) => {
      setQuery(val);
      if (!val.trim()) {
        setShowHistory(true);
      }
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    if (query.trim()) {
      addToHistory(query.trim());
      setDebouncedQuery(query.trim());
      setShowHistory(false);
    }
  }, [query, addToHistory]);

  const selectHistory = useCallback(
    (term: string) => {
      setQuery(term);
      setDebouncedQuery(term);
      setShowHistory(false);
      addToHistory(term);
    },
    [addToHistory],
  );

  const clearHistory = useCallback(() => {
    saveHistory([]);
    setHistory([]);
  }, []);

  const handleCatChange = useCallback((id: string) => {
    setActiveCat(id);
  }, []);

  const allCategories = [{ id: "all", name: "全部" }, ...categories];

  const shouldShowHistory = showHistory && !debouncedQuery && history.length > 0;

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] pb-20">
      <div className="sticky top-0 z-40 bg-[var(--theme-surface)]/95 px-4 py-3 backdrop-blur-md border-b border-[var(--theme-border)]">
        <div className="mx-auto max-w-lg space-y-3">
          <SearchBar
            value={query}
            onChange={handleSearch}
            placeholder="搜索商品..."
            onFocus={() => !query.trim() && setShowHistory(true)}
            onSubmit={handleSubmit}
          />
          {loading && categories.length === 0 ? (
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-16 flex-shrink-0 rounded-full" />
              ))}
            </div>
          ) : (
            <CategoryTabs categories={allCategories} activeId={activeCat} onChange={handleCatChange} />
          )}
        </div>
      </div>

      <main className="mx-auto max-w-lg px-4 py-6">
        {shouldShowHistory && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Clock size={14} className="text-muted-foreground" /> 搜索历史
              </h3>
              <button
                onClick={clearHistory}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                清空
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((term) => (
                <button
                  key={term}
                  onClick={() => selectHistory(term)}
                  className="flex items-center gap-1 rounded-full bg-[var(--theme-surface)] border border-[var(--theme-border)] px-3 py-1.5 text-xs text-[var(--theme-text)] transition-colors"
                >
                  {term}
                  <X
                    size={12}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newList = history.filter((h) => h !== term);
                      saveHistory(newList);
                      setHistory(newList);
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl bg-destructive/10 p-3 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {!shouldShowHistory && (
          <>
            <div className="grid grid-cols-2 gap-4">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
                : products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
            </div>
            {!loading && products.length === 0 && (
              <div className="py-20 text-center text-sm text-muted-foreground">没有找到相关商品</div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
