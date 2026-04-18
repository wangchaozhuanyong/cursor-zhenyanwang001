import SearchBar from "@/components/SearchBar";

interface FilterOption {
  value: string;
  label: string;
}

interface AdminFilterBarProps {
  keyword?: string;
  onKeywordChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: {
    key: string;
    value: string;
    options: FilterOption[];
    onChange: (v: string) => void;
  }[];
  actions?: React.ReactNode;
}

export default function AdminFilterBar({
  keyword,
  onKeywordChange,
  searchPlaceholder = "搜索...",
  filters,
  actions,
}: AdminFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {onKeywordChange !== undefined && (
        <div className="min-w-0 flex-1">
          <SearchBar placeholder={searchPlaceholder} value={keyword || ""} onChange={onKeywordChange} />
        </div>
      )}
      {filters?.map((f) => (
        <select
          key={f.key}
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          className="touch-manipulation min-h-[44px] rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none"
        >
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
