import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useMotionConfig } from "@/modules/micro-interactions";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import type { Category } from "@/types/category";

const TAB_INDICATOR_SPRING = { type: "spring" as const, stiffness: 380, damping: 32 };

type CategorySubcategoryRailProps = {
  categories: Category[];
  activeCat: string;
  onSelect: (id: string) => void;
  layoutId: string;
  className?: string;
  allItem?: {
    id: string;
    label?: string;
    onSelect?: () => void;
  };
};

export default function CategorySubcategoryRail({
  categories,
  activeCat,
  onSelect,
  layoutId,
  className,
  allItem,
}: CategorySubcategoryRailProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const allItemId = allItem?.id;
  const activeKey = allItemId && activeCat === allItemId ? allItemId : activeCat;

  useEffect(() => {
    const rail = railRef.current;
    const activeButton = itemRefs.current.get(activeKey);
    if (!rail || !activeButton) return;

    const prefersReducedMotion =
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const railRect = rail.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    const centeredLeft = rail.scrollLeft + buttonRect.left - railRect.left - (rail.clientWidth - activeButton.clientWidth) / 2;
    const maxLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);

    rail.scrollTo({
      left: Math.min(Math.max(0, centeredLeft), maxLeft),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [activeKey, categories.length]);

  return (
    <div
      ref={railRef}
      className={cn("store-category-subtabs no-scrollbar flex flex-nowrap gap-1.5", className)}
      role="tablist"
      aria-label="子分类"
    >
      {allItem ? (
        <CategoryTabButton
          active={activeCat === allItem.id}
          onClick={allItem.onSelect ?? (() => onSelect(allItem.id))}
          layoutId={layoutId}
          activeClassName="store-category-subtab-active-bg"
          activeTextClass="store-category-subtab-active-label"
          className="store-category-subtab px-3"
          btnRef={(el) => {
            if (el) itemRefs.current.set(allItem.id, el);
            else itemRefs.current.delete(allItem.id);
          }}
        >
          {allItem.label ?? "全部"}
        </CategoryTabButton>
      ) : null}
      {categories.map((child) => (
        <CategoryTabButton
          key={child.id}
          active={activeCat === child.id}
          onClick={() => onSelect(child.id)}
          layoutId={layoutId}
          activeClassName="store-category-subtab-active-bg"
          activeTextClass="store-category-subtab-active-label"
          className="store-category-subtab px-3"
          btnRef={(el) => {
            if (el) itemRefs.current.set(child.id, el);
            else itemRefs.current.delete(child.id);
          }}
        >
          {child.name}
        </CategoryTabButton>
      ))}
    </div>
  );
}

function CategoryTabButton({
  active,
  onClick,
  layoutId,
  children,
  className,
  btnRef,
  activeClassName = "bg-[var(--theme-primary)]",
  activeTextClass = "text-[var(--theme-primary-foreground)]",
}: {
  active: boolean;
  onClick: () => void;
  layoutId: string;
  children: ReactNode;
  className?: string;
  btnRef?: (el: HTMLButtonElement | null) => void;
  activeClassName?: string;
  activeTextClass?: string;
}) {
  const { enabled } = useMotionConfig();
  return (
    <UnifiedButton
      ref={btnRef}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative flex-shrink-0 overflow-hidden rounded-full px-4 py-1.5 text-xs font-medium",
        active ? "border border-transparent" : "border border-[var(--theme-border)] bg-[var(--theme-surface)]",
        active && "is-active",
        className,
      )}
    >
      {active ? (
        enabled ? (
          <motion.span
            layoutId={layoutId}
            className={cn("absolute inset-0 rounded-full", activeClassName)}
            transition={TAB_INDICATOR_SPRING}
          />
        ) : (
          <span className={cn("absolute inset-0 rounded-full", activeClassName)} />
        )
      ) : null}
      <span className={cn("relative z-10", active ? activeTextClass : "text-[var(--theme-text)]")}>{children}</span>
    </UnifiedButton>
  );
}
