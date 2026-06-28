import HomeNavIcon from "@/components/store/HomeNavIcon";
import type { CategoryKingkongItem } from "@/components/CategoryKingkongRow";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type StoreCategoryPrimaryNavProps = {
  items: CategoryKingkongItem[];
  loading: boolean;
};

export default function StoreCategoryPrimaryNav({ items, loading }: StoreCategoryPrimaryNavProps) {
  return (
    <nav className="sf-next-category-pills" aria-label="一级商品分类">
      {loading
        ? Array.from({ length: 5 }).map((_, index) => (
            <span key={index} className="sf-next-category-pill is-loading" aria-hidden />
          ))
        : items.map((item) => (
            <UnifiedButton
              key={item.id}
              type="button"
              aria-pressed={item.active}
              aria-current={item.active ? "true" : undefined}
              className={cn("sf-next-category-pill", item.active && "is-active")}
              onClick={item.onClick}
            >
              <span className="sf-next-category-pill__icon" aria-hidden>
                <HomeNavIcon value={item.iconValue} imageClassName="sf-next-category-pill__icon-image" />
              </span>
              <span className="sf-next-category-pill__label">{item.label}</span>
            </UnifiedButton>
          ))}
    </nav>
  );
}
