import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChevronRight, Clock3, Search, Tags, X } from "lucide-react";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import type { StoreSearchDrawerProps } from "@/components/store/StoreSearchDrawer";
import { STORE_COPY } from "@/constants/storeCopy";
import { cn } from "@/lib/utils";
import { useOverlayDismiss } from "@/modules/micro-interactions/hooks/useOverlayDismiss";
import { useModalLayer } from "@/modules/micro-interactions/modal/ModalLayerProvider";
import { fetchHotSearchTerms, fetchSearchSuggestions } from "@/services/searchService";
import type { HotSearchTerm, SearchSuggestion } from "@/types/search";

const SEARCH_HISTORY_KEY = "search_history";
const MAX_SEARCH_HISTORY = 10;
const MAX_HOT_TERMS = 10;
const FALLBACK_HOT_TERMS = ["新品", "热销", "优惠券", "礼盒"];

export default function StoreSearchDrawerPanel({
  open,
  value = "",
  placeholder = STORE_COPY.searchPlaceholder,
  categories = [],
  tags = [],
  onClose,
  onSubmit,
  onValueChange,
  onClear,
}: StoreSearchDrawerProps) {
  const [draft, setDraft] = useState(value);
  const [history, setHistory] = useState<string[]>([]);
  const [hotTerms, setHotTerms] = useState<HotSearchTerm[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const { overlayZ, isTop } = useModalLayer(open);

  useOverlayDismiss({
    open,
    onClose,
    isTop,
    lockBody: true,
    closeOnEscape: true,
    returnFocusRef,
    contentRef: drawerRef,
    trapFocus: true,
  });

  useLayoutEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = document.getElementById("root");
    if (!root) return;
    const hadInert = root.hasAttribute("inert");
    const previousAriaHidden = root.getAttribute("aria-hidden");
    root.setAttribute("inert", "");
    root.setAttribute("aria-hidden", "true");

    return () => {
      if (!hadInert) root.removeAttribute("inert");
      if (previousAriaHidden === null) {
        root.removeAttribute("aria-hidden");
      } else {
        root.setAttribute("aria-hidden", previousAriaHidden);
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setDraft(value);
    setHistory(readSearchHistory());
    const timer = window.setTimeout(() => inputRef.current?.focus(), 100);

    fetchHotSearchTerms(MAX_HOT_TERMS)
      .then(setHotTerms)
      .catch(() => setHotTerms([]));

    return () => {
      window.clearTimeout(timer);
    };
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    const term = draft.trim();
    if (!term) {
      setSuggestions([]);
      return;
    }
    suggestTimerRef.current = setTimeout(() => {
      fetchSearchSuggestions(term, 8)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 220);
    return () => {
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    };
  }, [draft, open]);

  const hotTermLabels = useMemo(() => buildHotTermLabels(hotTerms), [hotTerms]);
  const shouldShowSuggestions = draft.trim().length > 0 && suggestions.length > 0;

  if (!open) return null;

  const updateDraft = (nextValue: string) => {
    setDraft(nextValue);
    onValueChange?.(nextValue);
  };

  const clearDraft = () => {
    updateDraft("");
    onClear?.();
    inputRef.current?.focus();
  };

  const submitTerm = (term: string) => {
    const normalized = normalizeSearchTerm(term);
    if (normalized) {
      const nextHistory = saveSearchHistory(normalized);
      setHistory(nextHistory);
    }
    onSubmit(normalized);
    onClose();
  };

  const drawer = (
    <div
      ref={drawerRef}
      className="sf-next-store-search-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="搜索商品、服务或品牌"
      tabIndex={-1}
      style={{ zIndex: overlayZ }}
    >
      <button type="button" className="sf-next-store-search-drawer__scrim" onClick={onClose} aria-label="关闭搜索" />
      <aside className="sf-next-store-search-drawer__sheet">
        <form
          className="sf-next-store-search-drawer__bar"
          onSubmit={(event) => {
            event.preventDefault();
            submitTerm(draft);
          }}
        >
          <UnifiedButton type="button" className="sf-next-store-search-drawer__back" onClick={onClose} aria-label="返回">
            <ArrowLeft size={20} aria-hidden />
          </UnifiedButton>
          <label className="sr-only" htmlFor="storefront-unified-search-input">搜索商品、服务或品牌</label>
          <div className="sf-next-store-search-drawer__input">
            <Search size={18} aria-hidden />
            <input
              id="storefront-unified-search-input"
              ref={inputRef}
              type="search"
              enterKeyHint="search"
              value={draft}
              placeholder={placeholder}
              onChange={(event) => updateDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                event.preventDefault();
                submitTerm(draft);
              }}
            />
            {draft ? (
              <UnifiedButton type="button" className="sf-next-store-search-drawer__clear" onClick={clearDraft} aria-label="清空搜索关键词">
                <X size={15} aria-hidden />
              </UnifiedButton>
            ) : null}
          </div>
          <UnifiedButton type="submit" className="sf-next-store-search-drawer__submit">
            搜索
          </UnifiedButton>
        </form>

        <div className="sf-next-store-search-drawer__content">
          {shouldShowSuggestions ? (
            <SearchDrawerSection title="搜索建议">
              <div className="sf-next-store-search-drawer__list">
                {suggestions.map((item) => (
                  <UnifiedButton
                    key={`${item.source}-${item.keyword}`}
                    type="button"
                    className="sf-next-store-search-drawer__row"
                    onClick={() => submitTerm(item.keyword)}
                  >
                    <span className="sf-next-store-search-drawer__row-icon"><Search size={16} aria-hidden /></span>
                    <span>{item.keyword}</span>
                    <small>{item.source === "product" ? "商品" : "热搜"}</small>
                  </UnifiedButton>
                ))}
              </div>
            </SearchDrawerSection>
          ) : null}

          {!draft.trim() && history.length > 0 ? (
            <SearchDrawerSection
              title="搜索历史"
              action={(
                <UnifiedButton
                  type="button"
                  className="sf-next-store-search-drawer__section-action"
                  onClick={() => {
                    writeSearchHistory([]);
                    setHistory([]);
                  }}
                >
                  清空
                </UnifiedButton>
              )}
            >
              <div className="sf-next-store-search-drawer__chips">
                {history.slice(0, 8).map((term) => (
                  <UnifiedButton key={term} type="button" className="sf-next-store-search-drawer__chip" onClick={() => submitTerm(term)}>
                    <Clock3 size={14} aria-hidden />
                    {term}
                  </UnifiedButton>
                ))}
              </div>
            </SearchDrawerSection>
          ) : null}

          <SearchDrawerSection title="热门搜索">
            <div className="sf-next-store-search-drawer__chips">
              {hotTermLabels.map((term) => (
                <UnifiedButton key={term} type="button" className="sf-next-store-search-drawer__chip" onClick={() => submitTerm(term)}>
                  {term}
                </UnifiedButton>
              ))}
            </div>
          </SearchDrawerSection>

          {tags.length > 0 ? (
            <SearchDrawerSection title="商品标签">
              <div className="sf-next-store-search-drawer__chips">
                {tags.slice(0, 14).map((tag) => (
                  <UnifiedButton
                    key={tag.id}
                    type="button"
                    className={cn("sf-next-store-search-drawer__chip", tag.active && "is-active")}
                    onClick={() => {
                      tag.onSelect();
                      onClose();
                    }}
                  >
                    <Tags size={14} aria-hidden />
                    {tag.label}
                  </UnifiedButton>
                ))}
              </div>
            </SearchDrawerSection>
          ) : null}

          {categories.length > 0 ? (
            <SearchDrawerSection title="快捷分类">
              <div className="sf-next-store-search-drawer__category-grid">
                {categories.slice(0, 14).map((category) => (
                  <UnifiedButton
                    key={category.id}
                    type="button"
                    className={cn("sf-next-store-search-drawer__category", category.active && "is-active")}
                    onClick={() => {
                      category.onSelect();
                      onClose();
                    }}
                  >
                    <span>{category.label}</span>
                    <ChevronRight size={16} aria-hidden />
                  </UnifiedButton>
                ))}
              </div>
            </SearchDrawerSection>
          ) : null}
        </div>
      </aside>
    </div>
  );

  return createPortal(drawer, document.body);
}

function SearchDrawerSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="sf-next-store-search-drawer__section" aria-labelledby={`store-search-drawer-${title}`}>
      <div className="sf-next-store-search-drawer__section-head">
        <h2 id={`store-search-drawer-${title}`}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function normalizeSearchTerm(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function buildHotTermLabels(terms: HotSearchTerm[]): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  const pushTerm = (term: string) => {
    const label = normalizeSearchTerm(term);
    const key = label.toLocaleLowerCase();
    if (!label || /^\d+$/.test(label) || seen.has(key)) return;
    seen.add(key);
    labels.push(label);
  };

  terms.map((term) => term.keyword).forEach(pushTerm);
  FALLBACK_HOT_TERMS.forEach(pushTerm);
  return labels.slice(0, MAX_HOT_TERMS);
}

function readSearchHistory(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeSearchHistory(list: string[]) {
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(list.slice(0, MAX_SEARCH_HISTORY)));
}

function saveSearchHistory(term: string) {
  const nextHistory = [term, ...readSearchHistory().filter((item) => item !== term)].slice(0, MAX_SEARCH_HISTORY);
  writeSearchHistory(nextHistory);
  return nextHistory;
}
