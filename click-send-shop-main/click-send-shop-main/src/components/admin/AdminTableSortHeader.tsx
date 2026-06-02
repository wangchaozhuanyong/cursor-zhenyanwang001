import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  adminTableAlignClass,
  type AdminTableAlign,
} from "@/utils/adminTableClasses";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type AdminTableSortHeaderProps = {
  label: string;
  direction?: "asc" | "desc" | null;
  sortable?: boolean;
  className?: string;
  /** 列对齐：表头与排序按钮同向，与数据列一致 */
  align?: AdminTableAlign;
  onSort?: () => void;
};

export default function AdminTableSortHeader({
  label,
  direction = null,
  sortable = true,
  className,
  align = "left",
  onSort,
}: AdminTableSortHeaderProps) {
  const alignClass = adminTableAlignClass(align);
  const buttonJustify =
    align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";

  if (!sortable) {
    return (
      <th
        className={cn(
          "px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap",
          alignClass,
          className,
        )}
      >
        {label}
      </th>
    );
  }

  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown;
  const active = direction === "asc" || direction === "desc";

  return (
    <th className={cn("px-4 py-3 whitespace-nowrap", alignClass, className)}>
      <UnifiedButton
        type="button"
        onClick={onSort}
        className={cn(
          "inline-flex max-w-full items-center gap-1 rounded-md text-xs font-semibold transition-colors",
          buttonJustify,
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
      </UnifiedButton>
    </th>
  );
}
