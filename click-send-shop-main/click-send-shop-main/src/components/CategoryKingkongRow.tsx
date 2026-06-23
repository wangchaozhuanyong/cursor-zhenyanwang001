import CategoryNavTile from "@/components/store/CategoryNavTile";
import { cn } from "@/lib/utils";
import { useHorizontalActiveScroll } from "@/hooks/useHorizontalActiveScroll";

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
  const { containerRef: railRef, setItemRef, scrollToKey } = useHorizontalActiveScroll<HTMLDivElement, HTMLButtonElement>(
    scrollKey,
    `${loading ? "loading" : "ready"}:${items.length}`,
  );

  return (
    <section
      className={cn(
        "store-category-rail relative min-w-0 max-w-full bg-[var(--theme-surface)]",
        variant === "standard" && "border-y border-[color-mix(in_srgb,var(--theme-border)_80%,transparent)]",
        variant === "plain" && "store-category-rail--plain bg-transparent",
        className,
      )}
      data-category-kingkong-variant={variant}
    >
      <div
        ref={railRef}
        className={cn(
          "store-category-rail-scroll no-scrollbar flex min-w-0 max-w-full snap-x snap-mandatory gap-2.5 overflow-x-auto overflow-y-hidden scroll-smooth px-3 py-3 pr-10 [-webkit-overflow-scrolling:touch] sm:gap-3 sm:px-4 sm:pr-12",
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
              id={item.id}
              label={item.label}
              iconValue={item.iconValue}
              active={item.active}
              variant={variant}
              onClick={() => {
                scrollToKey(item.id);
                item.onClick();
              }}
              btnRef={(el) => setItemRef(item.id, el)}
            />
          ))
        )}
      </div>
    </section>
  );
}
