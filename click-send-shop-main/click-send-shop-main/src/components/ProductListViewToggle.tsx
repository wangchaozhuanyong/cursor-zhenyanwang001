import { LayoutGrid, List } from "lucide-react";
import type { CategoryListViewMode } from "@/hooks/useCategoryListView";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

interface ProductListViewToggleProps {
  value: CategoryListViewMode;
  onChange: (value: CategoryListViewMode) => void;
  className?: string;
}

/** 分类页：网格 / 列表单按钮切换（点击在两种展示间轮换） */
export default function ProductListViewToggle({ value, onChange, className }: ProductListViewToggleProps) {
  const isList = value === "list";

  return (
    <UnifiedButton
      type="button"
      aria-label={isList ? "当前为列表展示，点击切换为网格" : "当前为网格展示，点击切换为列表"}
      onClick={() => onChange(isList ? "grid" : "list")}
      className={cn(
        "sf-next-category-tool-icon inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[var(--theme-text)] transition duration-200",
        "hover:-translate-y-0.5 active:scale-[0.97]",
        className,
      )}
    >
      {isList ? <List size={16} aria-hidden /> : <LayoutGrid size={16} aria-hidden />}
    </UnifiedButton>
  );
}
