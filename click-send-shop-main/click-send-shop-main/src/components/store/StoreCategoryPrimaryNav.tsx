import { useEffect, useId, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import HomeNavIcon from "@/components/store/HomeNavIcon";
import { useHorizontalActiveScroll } from "@/hooks/useHorizontalActiveScroll";

export type StoreCategoryPrimaryNavItem = {
  id: string;
  label: string;
  iconValue: string;
  active: boolean;
  onClick: () => void;
};

type StoreCategoryPrimaryNavProps = {
  items: StoreCategoryPrimaryNavItem[];
  expandedItems: StoreCategoryPrimaryNavItem[];
  loading: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

export default function StoreCategoryPrimaryNav({
  items,
  expandedItems = items,
  loading,
  expanded = false,
  onExpandedChange = () => undefined,
}: StoreCategoryPrimaryNavProps) {
  const activeId = items.find((item) => item.active)?.id;
  const panelId = `store-category-primary-panel-${useId().replace(/:/g, "")}`;
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const { containerRef, setItemRef, scrollToKey } = useHorizontalActiveScroll<
    HTMLDivElement,
    HTMLButtonElement
  >(activeId, `${loading ? "loading" : "ready"}:${items.length}`);

  useEffect(() => {
    if (!expanded) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onExpandedChange(false);
      toggleRef.current?.focus();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [expanded, onExpandedChange]);

  const selectItem = (item: StoreCategoryPrimaryNavItem, closePanel: boolean) => {
    scrollToKey(item.id);
    item.onClick();
    if (closePanel || expanded) onExpandedChange(false);
  };

  const renderItem = (
    item: StoreCategoryPrimaryNavItem,
    variant: "track" | "panel",
  ) => (
    <UnifiedButton
      ref={variant === "track" ? (element) => setItemRef(item.id, element) : undefined}
      key={`${variant}:${item.id}`}
      type="button"
      role="tab"
      title={item.label}
      aria-label={`${variant === "track" ? "一级分类" : "全部分类"}：${item.label}`}
      aria-pressed={item.active}
      aria-selected={item.active}
      aria-current={item.active ? "page" : undefined}
      className={cn(
        variant === "track"
          ? "sf-next-category-primary-item"
          : "sf-next-category-primary-panel-item",
        item.active && "is-active",
      )}
      onClick={() => selectItem(item, variant === "panel")}
    >
      <span
        className={cn(
          variant === "track"
            ? "sf-next-category-primary-icon"
            : "sf-next-category-primary-panel-icon",
        )}
        aria-hidden
      >
        <HomeNavIcon
          value={item.iconValue}
          className={cn(
            variant === "track"
              ? "sf-next-category-primary-icon-renderer"
              : "sf-next-category-primary-panel-icon-renderer",
          )}
          imageClassName={cn(
            variant === "track"
              ? "sf-next-category-primary-icon-image"
              : "sf-next-category-primary-panel-icon-image",
          )}
          objectFit="contain"
        />
      </span>
      <span
        className={cn(
          variant === "track"
            ? "sf-next-category-primary-label"
            : "sf-next-category-primary-panel-label",
        )}
      >
        {item.label}
      </span>
    </UnifiedButton>
  );

  return (
    <nav className="sf-next-category-primary-nav" aria-label="一级商品分类">
      <div className="sf-next-category-primary-bar">
        <div ref={containerRef} className="sf-next-category-primary-scroll" role="tablist">
          {items.map((item) => renderItem(item, "track"))}
          {loading
            ? Array.from({ length: 5 }).map((_, index) => (
              <span key={`track-loading:${index}`} className="sf-next-category-primary-item is-loading" aria-hidden>
                <span className="sf-next-category-primary-icon" />
                <span className="sf-next-category-primary-label" />
              </span>
            ))
            : null}
        </div>

        <span className="sf-next-category-primary-more-shell">
          <UnifiedButton
            ref={toggleRef}
            type="button"
            className={cn("sf-next-category-primary-more", expanded && "is-expanded")}
            aria-label={expanded ? "收起全部一级分类" : "展开全部一级分类"}
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => onExpandedChange(!expanded)}
          >
            <span>全部</span>
            <ChevronDown className="sf-next-category-primary-more-icon" size={16} strokeWidth={2} aria-hidden />
          </UnifiedButton>
        </span>
      </div>

      <section
        id={panelId}
        className={cn("sf-next-category-primary-panel", expanded && "is-expanded")}
        aria-label="全部一级分类"
        hidden={!expanded}
      >
        <div className="sf-next-category-primary-panel-grid" role="tablist" aria-label="全部一级分类">
          {expandedItems.map((item) => renderItem(item, "panel"))}
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
              <span key={`panel-loading:${index}`} className="sf-next-category-primary-panel-item is-loading" aria-hidden>
                <span className="sf-next-category-primary-panel-icon" />
                <span className="sf-next-category-primary-panel-label" />
              </span>
            ))
            : null}
        </div>
      </section>
    </nav>
  );
}
