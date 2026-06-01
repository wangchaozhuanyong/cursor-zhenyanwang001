import { useEffect, useRef } from "react";
import CategoryNavTile from "@/components/store/CategoryNavTile";
import { cn } from "@/lib/utils";

export type CategoryKingkongItem = {
  id: string;
  label: string;
  iconValue: string;
  active: boolean;
  onClick: () => void;
};

type CategoryKingkongRowProps = {
  items: CategoryKingkongItem[];
  className?: string;
  scrollKey?: string;
  loading?: boolean;
  loadingSlots?: number;
};

function LoadingSlots({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex h-[4.75rem] w-[4.5rem] shrink-0 animate-pulse flex-col items-center justify-center gap-1.5 rounded-lg bg-[var(--theme-bg)]"
          aria-hidden
        />
      ))}
    </>
  );
}

export default function CategoryKingkongRow({
  items,
  className,
  scrollKey,
  loading = false,
  loadingSlots = 6,
}: CategoryKingkongRowProps) {
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (!scrollKey) return;
    const btn = itemRefs.current.get(scrollKey);
    btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [scrollKey, items.length]);

  return (
    <section
      className={cn(
        "store-category-rail relative border-y border-[color-mix(in_srgb,var(--theme-border)_80%,transparent)] bg-[var(--theme-surface)]",
        className,
      )}
    >
      <div
        className="no-scrollbar flex snap-x snap-mandatory gap-1 overflow-x-auto overflow-y-hidden scroll-smooth px-3 py-3.5 [-webkit-overflow-scrolling:touch] sm:justify-around sm:gap-0 sm:overflow-x-visible sm:px-4"
        role="tablist"
        aria-label="商品分类"
      >
        {loading ? (
          <LoadingSlots count={loadingSlots} />
        ) : (
          items.map((item) => (
            <CategoryNavTile
              key={item.id}
              label={item.label}
              iconValue={item.iconValue}
              active={item.active}
              onClick={item.onClick}
              btnRef={(el) => {
                if (el) itemRefs.current.set(item.id, el);
                else itemRefs.current.delete(item.id);
              }}
            />
          ))
        )}
      </div>
    </section>
  );
}
