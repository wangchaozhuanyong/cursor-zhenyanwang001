import { useEffect, useRef } from "react";
import CategoryNavTile from "@/components/store/CategoryNavTile";
import { cn } from "@/lib/utils";

export type CategoryKingkongVariant = "standard" | "plain";

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
  variant?: CategoryKingkongVariant;
};

function LoadingSlots({ count, variant }: { count: number; variant: CategoryKingkongVariant }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "store-category-tile-skeleton flex shrink-0 animate-pulse flex-col items-center justify-center gap-1.5",
            variant === "plain"
              ? "store-category-tile-skeleton--plain w-[4.95rem]"
              : "h-[4.85rem] w-[5.05rem] rounded-[0.875rem]",
          )}
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
  variant = "standard",
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

    btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [firstItemId, scrollKey, items.length]);

  return (
    <section
      className={cn(
        "store-category-rail relative border-y border-[color-mix(in_srgb,var(--theme-border)_80%,transparent)] bg-[var(--theme-surface)]",
        variant === "plain" && "store-category-rail--plain",
        className,
      )}
      data-category-kingkong-variant={variant}
    >
      <div
        ref={railRef}
        className={cn(
          "store-category-rail-scroll no-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto overflow-y-hidden scroll-smooth px-3 py-3 pr-10 [-webkit-overflow-scrolling:touch] sm:gap-3 sm:px-4 sm:pr-12",
          variant === "plain" && "store-category-rail-scroll--plain",
        )}
        role="tablist"
        aria-label="商品分类"
      >
        {loading ? (
          <LoadingSlots count={loadingSlots} variant={variant} />
        ) : (
          items.map((item) => (
            <CategoryNavTile
              key={item.id}
              label={item.label}
              iconValue={item.iconValue}
              active={item.active}
              variant={variant}
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
