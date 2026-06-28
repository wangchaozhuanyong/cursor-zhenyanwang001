import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import type { Category } from "@/types/category";
import { storefrontCategoryName } from "@/utils/storefrontCopySanitizer";

type StoreCategorySubcategorySelectorProps = {
  sectionLabel: string;
  activeCat: string;
  activeRootId: string;
  subCategories: Category[];
  visibleSubCategories: Category[];
  hasMoreSubCategories: boolean;
  hiddenSubcategoryCount: number;
  panelOpen: boolean;
  onClosePanel: () => void;
  onSelect: (categoryId: string) => void;
  onTogglePanel: () => void;
};

export default function StoreCategorySubcategorySelector({
  sectionLabel,
  activeCat,
  activeRootId,
  subCategories,
  visibleSubCategories,
  hasMoreSubCategories,
  hiddenSubcategoryCount,
  panelOpen,
  onClosePanel,
  onSelect,
  onTogglePanel,
}: StoreCategorySubcategorySelectorProps) {
  const renderOption = (id: string, label: string) => (
    <UnifiedButton
      key={id}
      type="button"
      aria-pressed={activeCat === id}
      className={cn("sf-next-subcategory-chip", activeCat === id && "is-active")}
      onClick={() => onSelect(id)}
    >
      {label}
    </UnifiedButton>
  );

  return (
    <section className="sf-next-subcategory-region" aria-label={sectionLabel}>
      <div className="sf-next-subcategory-strip" role="tablist" aria-label="二级分类">
        {renderOption(activeRootId, "全部")}
        {visibleSubCategories.map((child) => renderOption(child.id, storefrontCategoryName(child.name)))}
        {hasMoreSubCategories ? (
          <UnifiedButton
            type="button"
            aria-expanded={panelOpen}
            className={cn("sf-next-subcategory-chip sf-next-subcategory-more", panelOpen && "is-active")}
            onClick={onTogglePanel}
          >
            <span>更多{hiddenSubcategoryCount > 0 ? ` ${hiddenSubcategoryCount}` : ""}</span>
            <ChevronDown size={14} aria-hidden />
          </UnifiedButton>
        ) : null}
      </div>
      {hasMoreSubCategories && panelOpen ? (
        <div className="sf-next-subcategory-panel" aria-label="全部二级分类">
          <div className="sf-next-subcategory-panel__head">
            <strong>选择二级分类</strong>
            <UnifiedButton
              type="button"
              aria-label="收起二级分类"
              className="sf-next-subcategory-panel__close"
              onClick={onClosePanel}
            >
              <X size={15} aria-hidden />
            </UnifiedButton>
          </div>
          <div className="sf-next-subcategory-panel__grid">
            {renderOption(activeRootId, "全部")}
            {subCategories.map((child) => renderOption(child.id, storefrontCategoryName(child.name)))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
