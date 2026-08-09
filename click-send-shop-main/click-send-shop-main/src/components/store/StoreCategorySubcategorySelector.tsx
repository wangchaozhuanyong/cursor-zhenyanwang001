import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import type { Category } from "@/types/category";
import { storefrontCategoryName } from "@/utils/storefrontCopySanitizer";

type StoreCategorySubcategorySelectorProps = {
  sectionLabel: string;
  activeCat: string;
  activeRootId: string;
  subCategories: Category[];
  onSelect: (categoryId: string) => void;
};

export default function StoreCategorySubcategorySelector({
  sectionLabel,
  activeCat,
  activeRootId,
  subCategories,
  onSelect,
}: StoreCategorySubcategorySelectorProps) {
  const renderOption = (id: string, label: string) => (
    <UnifiedButton
      key={id}
      type="button"
      role="tab"
      title={label}
      aria-label={`二级分类：${label}`}
      aria-pressed={activeCat === id}
      aria-selected={activeCat === id}
      aria-current={activeCat === id ? "page" : undefined}
      className={cn("sf-next-category-secondary-item", activeCat === id && "is-active")}
      onClick={() => onSelect(id)}
    >
      <span>{label}</span>
    </UnifiedButton>
  );

  return (
    <nav className="sf-next-category-secondary-nav" aria-label={sectionLabel}>
      <div className="sf-next-category-secondary-list" role="tablist" aria-label="二级分类">
        {renderOption(activeRootId, "全部")}
        {subCategories.map((child) => renderOption(child.id, storefrontCategoryName(child.name)))}
      </div>
    </nav>
  );
}
