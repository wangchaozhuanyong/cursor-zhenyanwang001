import CategoryKingkongRow, { type CategoryKingkongItem } from "@/components/CategoryKingkongRow";
import { getCategoryNavIconValue } from "@/utils/categoryNavIcon";

interface CategoryTabsProps {
  categories: { id: string; name: string; icon?: string; icon_url?: string; level?: number }[];
  activeId: string;
  onChange: (id: string) => void;
  loading?: boolean;
  loadingSlots?: number;
}

export default function CategoryTabs({
  categories,
  activeId,
  onChange,
  loading = false,
  loadingSlots,
}: CategoryTabsProps) {
  const items: CategoryKingkongItem[] = categories.map((cat) => ({
    id: cat.id,
    label: cat.name,
    iconValue: getCategoryNavIconValue(cat, cat.id === "all" ? "📋" : "📂"),
    active: activeId === cat.id,
    onClick: () => onChange(cat.id),
  }));

  return (
    <CategoryKingkongRow
      items={items}
      scrollKey={activeId}
      loading={loading}
      loadingSlots={loadingSlots}
      className="-mx-1 rounded-none border-x-0"
    />
  );
}
