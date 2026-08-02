import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import HomeNavIcon from "@/components/store/HomeNavIcon";

type StoreCategoryPrimaryNavItem = {
  id: string;
  label: string;
  iconValue?: string;
  active: boolean;
  onClick: () => void;
};

type StoreCategoryPrimaryNavProps = {
  items: StoreCategoryPrimaryNavItem[];
  loading: boolean;
  variant?: "pills" | "curated";
};

export default function StoreCategoryPrimaryNav({
  items,
  loading,
  variant = "pills",
}: StoreCategoryPrimaryNavProps) {
  return (
    <nav
      className={variant === "curated" ? "curated-life-category-primary-grid" : "sf-next-category-pills"}
      data-category-nav-variant={variant}
      aria-label="一级商品分类"
    >
      {loading
        ? Array.from({ length: variant === "curated" ? 10 : 5 }).map((_, index) => (
            <span
              key={index}
              className={cn(
                variant === "curated" ? "curated-life-category-primary-item is-loading" : "sf-next-category-pill is-loading",
              )}
              aria-hidden
            />
          ))
        : items.map((item) => (
            <UnifiedButton
              key={item.id}
              type="button"
              aria-pressed={item.active}
              aria-current={item.active ? "true" : undefined}
              className={cn(
                variant === "curated" ? "curated-life-category-primary-item" : "sf-next-category-pill",
                item.active && "is-active",
              )}
              onClick={item.onClick}
            >
              {variant === "curated" ? (
                <span className="curated-life-category-primary-item__icon">
                  <HomeNavIcon
                    value={item.iconValue || "category"}
                    className="curated-life-category-primary-item__icon-media"
                    imageClassName="curated-life-category-primary-item__icon-image"
                  />
                </span>
              ) : null}
              <span className="sf-next-category-pill__label">{item.label}</span>
            </UnifiedButton>
          ))}
    </nav>
  );
}
