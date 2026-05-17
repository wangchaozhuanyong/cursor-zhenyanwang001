import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { Category } from "@/types/category";
import { isCategoryOrDescendantActive } from "@/utils/categoryTree";
import { useMotionConfig } from "@/modules/micro-interactions";
import { cn } from "@/lib/utils";

type CategorySideTreeProps = {
  categories: Category[];
  activeCat: string;
  onSelectAll: () => void;
  onRootClick: (category: Category) => void;
  onChildClick: (childId: string) => void;
};

const SIDE_TAB_SPRING = { type: "spring" as const, stiffness: 360, damping: 30 };

function SideNavButton({
  active,
  onClick,
  layoutId,
  activeClassName,
  activeTextClass,
  className,
  children,
}: {
  active: boolean;
  onClick: () => void;
  layoutId: string;
  activeClassName: string;
  activeTextClass?: string;
  className?: string;
  children: ReactNode;
}) {
  const { enabled } = useMotionConfig();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full overflow-hidden text-left transition-colors",
        active ? "border border-transparent" : "border border-transparent",
        className,
      )}
    >
      {active ? (
        enabled ? (
          <motion.span
            layoutId={layoutId}
            className={cn("absolute inset-0 rounded-xl", activeClassName)}
            transition={SIDE_TAB_SPRING}
          />
        ) : (
          <span className={cn("absolute inset-0 rounded-xl", activeClassName)} />
        )
      ) : null}
      <span className={cn("relative z-10 block", active && activeTextClass)}>{children}</span>
    </button>
  );
}

export default function CategorySideTree({
  categories,
  activeCat,
  onSelectAll,
  onRootClick,
  onChildClick,
}: CategorySideTreeProps) {
  const renderCategoryMark = (category: Category) => {
    if (category.icon_url) {
      return <img src={category.icon_url} alt="" className="mr-1 inline-block h-4 w-4 object-contain align-text-bottom" />;
    }
    if (category.icon) return <span className="mr-1">{category.icon}</span>;
    return null;
  };

  return (
    <aside className="hidden md:block md:w-64 lg:w-72">
      <div className="sticky top-20 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
        <SideNavButton
          active={activeCat === "all"}
          onClick={onSelectAll}
          layoutId="category-side-nav"
          activeClassName="bg-[var(--theme-primary)]"
          activeTextClass="font-semibold text-[var(--theme-primary-foreground)]"
          className="mb-2 rounded-xl px-3 py-2 text-sm"
        >
          全部分类
        </SideNavButton>

        <div className="space-y-1">
          {categories.map((category) => {
            const hasChildren = (category.children?.length ?? 0) > 0;
            const isActive = isCategoryOrDescendantActive(category, activeCat);

            return (
              <div key={category.id} className="rounded-xl border border-transparent">
                <SideNavButton
                  active={isActive}
                  onClick={() => onRootClick(category)}
                  layoutId="category-side-nav"
                  activeClassName="bg-[var(--theme-primary)]/12"
                  activeTextClass="font-medium text-[var(--theme-text)]"
                  className="rounded-xl px-3 py-2 text-sm"
                >
                  <span className="truncate">
                    {renderCategoryMark(category)}
                    {category.name}
                  </span>
                </SideNavButton>

                {hasChildren && isActive ? (
                  <div className="mt-1 space-y-1 pl-3">
                    {category.children!.map((child) => (
                      <SideNavButton
                        key={child.id}
                        active={activeCat === child.id}
                        onClick={() => onChildClick(child.id)}
                        layoutId="category-side-subnav"
                        activeClassName="bg-[var(--theme-price)]/12"
                        activeTextClass="text-xs font-medium text-[var(--theme-price)]"
                        className="rounded-lg px-3 py-1.5"
                      >
                        {renderCategoryMark(child)}
                        {child.name}
                      </SideNavButton>
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
