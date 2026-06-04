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
          className="store-category-tile-skeleton flex h-[4.25rem] w-[4.75rem] shrink-0 animate-pulse flex-col items-center justify-center gap-1.5 rounded-[0.875rem]"
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
  const railRef = useRef<HTMLDivElement>(null);
  const firstItemId = items[0]?.id;

  useEffect(() => {
    if (!scrollKey) return;
    const rail = railRef.current;
    const btn = itemRefs.current.get(scrollKey);
    if (!rail || !btn) return;

    if (scrollKey === firstItemId) {
      rail.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }

    btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [firstItemId, scrollKey, items.length]);

  return (
    <section
      className={cn(
        "store-category-rail relative border-y border-[color-mix(in_srgb,var(--theme-border)_80%,transparent)] bg-[var(--theme-surface)]",
        className,
      )}
    >
      <div
        ref={railRef}
        className="store-category-rail-scroll no-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto overflow-y-hidden scroll-smooth px-3 py-3 pr-10 [-webkit-overflow-scrolling:touch] sm:gap-3 sm:px-4 sm:pr-12"
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
