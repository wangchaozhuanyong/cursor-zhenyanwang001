import { SlidersHorizontal } from "lucide-react";
import type { ProductSortType } from "@/types/product";

type SortItem = {
  value: ProductSortType;
  label: string;
};

const sortItems: SortItem[] = [
  { value: "default", label: "综合" },
  { value: "sales", label: "热销" },
  { value: "newest", label: "最新" },
  { value: "price-asc", label: "价格↑" },
  { value: "price-desc", label: "价格↓" },
];

interface ProductSortBarProps {
  value: ProductSortType;
  onChange: (value: ProductSortType) => void;
}

export default function ProductSortBar({ value, onChange }: ProductSortBarProps) {
  return (
    <div className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2">
      <SlidersHorizontal size={14} className="shrink-0 text-muted-foreground" />
      {sortItems.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs transition-colors ${
            value === item.value
              ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
