import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type StoreSearchFieldProps = {
  mode: "navigate" | "filter";
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onNavigate?: () => void;
  className?: string;
};

const fieldClass =
  "w-full rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] py-1.5 pl-9 pr-4 text-sm text-[var(--theme-text)] placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-price)] focus:outline-none";

export default function StoreSearchField({
  mode,
  placeholder = "搜索商品或品牌...",
  value = "",
  onValueChange,
  onNavigate,
  className,
}: StoreSearchFieldProps) {
  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center" aria-hidden>
        <Search className="h-4 w-4 text-[var(--theme-text-muted)]" />
      </div>
      <input
        type="search"
        readOnly={mode === "navigate"}
        value={mode === "filter" ? value : undefined}
        placeholder={placeholder}
        onChange={mode === "filter" ? (e) => onValueChange?.(e.target.value) : undefined}
        onFocus={mode === "navigate" ? onNavigate : undefined}
        onClick={mode === "navigate" ? onNavigate : undefined}
        className={cn(fieldClass, mode === "navigate" && "cursor-pointer")}
        aria-label={placeholder}
      />
    </div>
  );
}
