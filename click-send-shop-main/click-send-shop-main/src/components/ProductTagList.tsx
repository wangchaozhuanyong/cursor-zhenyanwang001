import type { ProductCatalogTag } from "@/types/product";
import { productTagInlineStyle } from "@/utils/productTagBadge";

interface ProductTagListProps {
  tags?: ProductCatalogTag[];
  max?: number;
  className?: string;
  size?: "sm" | "md";
}

export default function ProductTagList({
  tags = [],
  max = 3,
  className = "",
  size = "sm",
}: ProductTagListProps) {
  const visibleTags = [...tags]
    .sort((a, b) => (Number(b.sort_order) || 0) - (Number(a.sort_order) || 0))
    .slice(0, max);

  if (visibleTags.length === 0) return null;

  const sizeClass = size === "md"
    ? "px-2.5 py-1 text-[11px]"
    : "px-2 py-0.5 text-[10px]";

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {visibleTags.map((tag, index) => (
        <span
          key={tag.id || `${tag.name}-${index}`}
          className={`inline-flex max-w-[7rem] items-center rounded-full border font-bold leading-4 shadow-sm backdrop-blur ${sizeClass}`}
          style={productTagInlineStyle(tag)}
          title={tag.name}
        >
          <span className="truncate">{tag.name}</span>
        </span>
      ))}
    </div>
  );
}
