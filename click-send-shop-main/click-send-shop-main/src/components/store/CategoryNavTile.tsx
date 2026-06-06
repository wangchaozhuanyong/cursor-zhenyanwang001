import type { Ref } from "react";
import type { CategoryKingkongVariant } from "@/components/CategoryKingkongRow";
import HomeNavIcon from "@/components/store/HomeNavIcon";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type CategoryNavTileProps = {
  label: string;
  iconValue: string;
  active?: boolean;
  onClick: () => void;
  btnRef?: Ref<HTMLButtonElement>;
  className?: string;
  variant?: CategoryKingkongVariant;
};

/** Category/search shortcut tile: icon above label, aligned with home shortcuts. */
export default function CategoryNavTile({
  label,
  iconValue,
  active = false,
  onClick,
  btnRef,
  className,
  variant = "standard",
}: CategoryNavTileProps) {
  const isPlain = variant === "plain";

  return (
    <UnifiedButton
      ref={btnRef}
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "store-category-tile group flex h-[4.85rem] w-[5.05rem] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-[0.875rem] border text-center transition duration-200 active:scale-[0.98]",
        isPlain && "store-category-tile--plain",
        active ? "is-active" : "opacity-95",
        className,
      )}
    >
      <span
        className={cn(
          "store-category-tile-icon flex h-10 w-10 shrink-0 items-center justify-center",
          isPlain && "store-category-tile-icon--plain",
        )}
      >
        <HomeNavIcon
          value={iconValue}
          imageClassName={isPlain ? "h-9 w-9" : undefined}
        />
      </span>
      <span
        className={cn(
          "store-category-tile-label w-full truncate px-1 text-xs font-medium leading-tight",
          isPlain && "store-category-tile-label--plain",
          active && "font-semibold",
        )}
      >
        {label}
      </span>
    </UnifiedButton>
  );
}
