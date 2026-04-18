import { useEffect, useRef } from "react";

interface CategoryTabsProps {
  categories: { id: string; name: string; icon?: string }[];
  activeId: string;
  onChange: (id: string) => void;
}

export default function CategoryTabs({ categories, activeId, onChange }: CategoryTabsProps) {
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const btn = itemRefs.current.get(activeId);
    btn?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeId, categories.length]);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat.id}
          ref={(el) => {
            if (el) itemRefs.current.set(cat.id, el);
            else itemRefs.current.delete(cat.id);
          }}
          onClick={() => onChange(cat.id)}
          className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
            activeId === cat.id
              ? "bg-gold text-primary-foreground"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {cat.icon && <span className="mr-1">{cat.icon}</span>}
          {cat.name}
        </button>
      ))}
    </div>
  );
}
