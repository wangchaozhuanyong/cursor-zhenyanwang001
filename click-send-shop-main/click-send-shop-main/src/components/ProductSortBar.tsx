import { ArrowDown, ArrowUp, SlidersHorizontal } from "lucide-react";
import type { ProductSortType } from "@/types/product";
import { cn } from "@/lib/utils";

type SortItem = {
  value: ProductSortType;
  label: string;
};

const baseSortItems: SortItem[] = [
  { value: "default", label: "综合" },
  { value: "sales", label: "热销" },
  { value: "newest", label: "最新" },
];

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
  const isPriceAsc = value === "price-asc";
  const isPriceDesc = value === "price-desc";
  const isPriceActive = isPriceAsc || isPriceDesc;
  const sortItems = hideNewest ? baseSortItems.filter((item) => item.value !== "newest") : baseSortItems;

  return (
    <div
      className={cn(
        "store-category-sortbar no-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto rounded-full border px-1.5 py-1.5 sm:gap-1.5 sm:px-2",
        className,
      )}
    >
      <SlidersHorizontal size={16} className="store-category-sortbar-icon shrink-0" aria-hidden />
      {sortItems.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={sortPillClass(value === item.value)}
        >
          {item.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(cyclePriceSort(value))}
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
      </button>
    </div>
  );
}

function sortPillClass(active: boolean) {
  return cn(
    "store-category-sort-pill inline-flex min-h-8 shrink-0 items-center justify-center gap-0.5 rounded-full px-3 py-1 text-xs font-semibold transition duration-200",
    active
      ? "is-active"
      : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]",
  );
}
