import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AdminTableSortHeaderProps = {
  label: string;
  direction?: "asc" | "desc" | null;
  sortable?: boolean;
  className?: string;
  onSort?: () => void;
};

export default function AdminTableSortHeader({
  label,
  direction = null,
  sortable = true,
  className,
  onSort,
}: AdminTableSortHeaderProps) {
  if (!sortable) {
    return (
      <th className={cn("px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap", className)}>
        {label}
      </th>
    );
  }

  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown;
  const active = direction === "asc" || direction === "desc";

  return (
    <th className={cn("px-4 py-3 text-left whitespace-nowrap", className)}>
      <button
        type="button"
        onClick={onSort}
        className={cn(
          "inline-flex max-w-full items-center gap-1 rounded-md text-xs font-semibold transition-colors",
          active ? "text-[var(--theme-primary)]" : "text-muted-foreground hover:text-foreground",
        )}
        aria-label={
          direction === "asc"
            ? `${label}，当前升序，点击切换为降序`
            : direction === "desc"
              ? `${label}，当前降序，点击恢复默认排序`
              : `${label}，点击按降序排序`
        }
      >
        <span>{label}</span>
        <Icon size={14} className={cn("shrink-0", !active && "opacity-55")} aria-hidden />
      </button>
    </th>
  );
}
