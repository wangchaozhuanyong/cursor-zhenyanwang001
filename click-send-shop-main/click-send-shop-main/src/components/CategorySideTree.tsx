import { ChevronDown } from "lucide-react";
import type { Category } from "@/types/category";
import { isCategoryOrDescendantActive } from "@/utils/categoryTree";

type CategorySideTreeProps = {
  categories: Category[];
  activeCat: string;
  expandedParentId: string | null;
  onSelectAll: () => void;
  onRootClick: (category: Category) => void;
  onChildClick: (parentId: string, childId: string) => void;
};

export default function CategorySideTree({
  categories,
  activeCat,
  expandedParentId,
  onSelectAll,
  onRootClick,
  onChildClick,
}: CategorySideTreeProps) {
  const renderCategoryMark = (category: Category) => {
    if (category.icon_url) {
      return <img src={category.icon_url} alt="" className="mr-1 inline-block h-4 w-4 rounded object-cover align-text-bottom" />;
    }
    if (category.icon) return <span className="mr-1">{category.icon}</span>;
    return null;
  };

  return (
    <aside className="hidden md:block md:w-64 lg:w-72">
      <div className="sticky top-20 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
        <button
          type="button"
          onClick={onSelectAll}
          className={`mb-2 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${
            activeCat === "all"
              ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
              : "text-[var(--theme-text)] hover:bg-[var(--theme-bg)]"
          }`}
        >
          全部分类
        </button>

        <div className="space-y-1">
          {categories.map((category) => {
            const hasChildren = (category.children?.length ?? 0) > 0;
            const isExpanded = expandedParentId === category.id;
            const isActive = isCategoryOrDescendantActive(category, activeCat);

            return (
              <div key={category.id} className="rounded-xl border border-transparent">
                <button
                  type="button"
                  onClick={() => onRootClick(category)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-[var(--theme-primary)]/10 text-[var(--theme-text)]"
                      : "text-[var(--theme-text)] hover:bg-[var(--theme-bg)]"
                  }`}
                >
                  <span className="truncate">
                    {renderCategoryMark(category)}
                    {category.name}
                  </span>
                  {hasChildren ? (
                    <ChevronDown size={14} className={`opacity-70 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  ) : null}
                </button>

                {hasChildren && isExpanded ? (
                  <div className="mt-1 space-y-1 pl-3">
                    {category.children!.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => onChildClick(category.id, child.id)}
                        className={`w-full rounded-lg px-3 py-1.5 text-left text-xs transition-colors ${
                          activeCat === child.id
                            ? "bg-[var(--theme-price)]/12 text-[var(--theme-price)]"
                            : "text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)]"
                        }`}
                      >
                        {renderCategoryMark(child)}
                        {child.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
