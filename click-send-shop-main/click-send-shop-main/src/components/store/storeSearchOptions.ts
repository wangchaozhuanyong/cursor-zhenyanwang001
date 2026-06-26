import { NEW_ARRIVAL_CATEGORY_LABEL } from "@/constants/newArrivalNavigation";
import type { Category } from "@/types/category";
import { storefrontCategoryName } from "@/utils/storefrontCopySanitizer";

export type StoreSearchCategoryOption = {
  id: string;
  label: string;
  active?: boolean;
  onSelect: () => void;
};

export type StoreSearchTagOption = {
  id: string;
  label: string;
  active?: boolean;
  onSelect: () => void;
};

type BuildStoreSearchCategoryOptionsArgs = {
  categories: Category[];
  activeCategoryId?: string;
  isNewActive?: boolean;
  onAll: () => void;
  onNew: () => void;
  onCategorySelect: (category: Category) => void;
};

export function buildStoreSearchCategoryOptions({
  categories,
  activeCategoryId,
  isNewActive,
  onAll,
  onNew,
  onCategorySelect,
}: BuildStoreSearchCategoryOptionsArgs): StoreSearchCategoryOption[] {
  return [
    {
      id: "all",
      label: "全部",
      active: activeCategoryId === "all" && !isNewActive,
      onSelect: onAll,
    },
    {
      id: "new",
      label: NEW_ARRIVAL_CATEGORY_LABEL,
      active: Boolean(isNewActive),
      onSelect: onNew,
    },
    ...categories.map((category) => ({
      id: category.id,
      label: storefrontCategoryName(category.name),
      active: activeCategoryId === category.id,
      onSelect: () => onCategorySelect(category),
    })),
  ];
}
