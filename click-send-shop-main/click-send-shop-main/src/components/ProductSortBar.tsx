import { useCallback, useEffect, useRef } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { ProductSortType } from "@/types/product";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type SortItem = {
  value: ProductSortType;
  label: string;
};

const baseSortItems: SortItem[] = [
  { value: "default", label: "综合" },
  { value: "sales", label: "热销" },
  { value: "newest", label: "最新" },
];

const PRICE_SORT_KEY = "price";

function cyclePriceSort(current: ProductSortType): ProductSortType {
  if (current === "price-asc") return "price-desc";
  if (current === "price-desc") return "default";
  return "price-asc";
}

interface ProductSortBarProps {
  value: ProductSortType;
  onChange: (value: ProductSortType) => void;
  /** 新品上市等已按上新筛选的列表：隐藏「最新」，避免与页面语义重复 */
  hideNewest?: boolean;
  className?: string;
}

/** 分类 / 新品列表：顶部横向排序，直接切换（不用底部上拉） */
export default function ProductSortBar({ value, onChange, hideNewest = false, className }: ProductSortBarProps) {
  const sortBarRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const isPriceAsc = value === "price-asc";
  const isPriceDesc = value === "price-desc";
  const isPriceActive = isPriceAsc || isPriceDesc;
  const sortItems = hideNewest ? baseSortItems.filter((item) => item.value !== "newest") : baseSortItems;
  const activeButtonKey = isPriceActive ? PRICE_SORT_KEY : value;

  const scrollButtonIntoView = useCallback((buttonKey: string) => {
    const bar = sortBarRef.current;
    const button = buttonRefs.current.get(buttonKey);
    if (!bar || !button) return;

    const prefersReducedMotion =
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth";
    const barRect = bar.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const centeredLeft = bar.scrollLeft + buttonRect.left - barRect.left - (bar.clientWidth - button.clientWidth) / 2;
    const maxLeft = Math.max(0, bar.scrollWidth - bar.clientWidth);

    bar.scrollTo({
      left: Math.min(Math.max(0, centeredLeft), maxLeft),
      behavior,
    });
  }, []);

  useEffect(() => {
    scrollButtonIntoView(activeButtonKey);
  }, [activeButtonKey, scrollButtonIntoView, sortItems.length]);

  return (
    <div
      ref={sortBarRef}
      className={cn(
        "store-category-sortbar no-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto overflow-y-hidden scroll-smooth rounded-full border px-1 py-1 [-webkit-overflow-scrolling:touch] sm:gap-2 sm:px-1.5",
        className,
      )}
    >
      {sortItems.map((item) => (
        <UnifiedButton
          key={item.value}
          ref={(node) => {
            if (node) buttonRefs.current.set(item.value, node);
            else buttonRefs.current.delete(item.value);
          }}
          type="button"
          aria-pressed={value === item.value}
          onClick={() => {
            onChange(item.value);
            scrollButtonIntoView(item.value);
          }}
          className={sortPillClass(value === item.value)}
        >
          {item.label}
        </UnifiedButton>
      ))}
      <UnifiedButton
        ref={(node) => {
          if (node) buttonRefs.current.set(PRICE_SORT_KEY, node);
          else buttonRefs.current.delete(PRICE_SORT_KEY);
        }}
        type="button"
        aria-pressed={isPriceActive}
        onClick={() => {
          onChange(cyclePriceSort(value));
          scrollButtonIntoView(PRICE_SORT_KEY);
        }}
        className={sortPillClass(isPriceActive)}
        aria-label={
          isPriceAsc ? "价格从低到高，点击切换为从高到低" : isPriceDesc ? "价格从高到低，点击恢复综合排序" : "按价格排序"
        }
      >
        <span>价格</span>
        {isPriceAsc ? (
          <ArrowUp size={12} className="shrink-0" aria-hidden />
        ) : isPriceDesc ? (
          <ArrowDown size={12} className="shrink-0" aria-hidden />
        ) : (
          <span className="flex shrink-0 flex-col leading-none opacity-60" aria-hidden>
            <ArrowUp size={10} className="-mb-0.5" />
            <ArrowDown size={10} />
          </span>
        )}
      </UnifiedButton>
    </div>
  );
}

function sortPillClass(active: boolean) {
  return cn(
    "store-category-sort-pill inline-flex min-h-8 shrink-0 items-center justify-center gap-0.5 rounded-full px-3 py-1 text-xs font-medium transition duration-200",
    active
      ? "is-active"
      : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]",
  );
}
