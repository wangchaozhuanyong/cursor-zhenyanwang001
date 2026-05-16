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
  className?: string;
}

export default function ProductSortBar({ value, onChange, className }: ProductSortBarProps) {
  const isPriceAsc = value === "price-asc";
  const isPriceDesc = value === "price-desc";
  const isPriceActive = isPriceAsc || isPriceDesc;

  return (
    <div
      className={cn(
        "no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2.5 py-2 sm:gap-2 sm:px-3",
        className,
      )}
    >
      <SlidersHorizontal size={14} className="shrink-0 text-muted-foreground" aria-hidden />
      {baseSortItems.map((item) => (
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
    "inline-flex shrink-0 items-center gap-0.5 rounded-full px-2.5 py-1 text-xs transition-colors",
    active
      ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
      : "text-muted-foreground hover:text-foreground",
  );
}
