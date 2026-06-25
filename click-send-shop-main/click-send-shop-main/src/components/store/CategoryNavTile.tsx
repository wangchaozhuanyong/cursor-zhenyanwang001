import type { Ref } from "react";
import type { CategoryKingkongVariant } from "@/components/CategoryKingkongRow";
import HomeNavIcon, { isHomeNavIconToken, isHomeNavImageIcon } from "@/components/store/HomeNavIcon";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type CategoryNavTileProps = {
  id?: string;
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
  id,
  label,
  iconValue,
  active = false,
  onClick,
  btnRef,
  className,
  variant = "standard",
}: CategoryNavTileProps) {
  const isPlain = variant === "plain";
  const resolvedIconValue = resolveCategoryTileIconValue({ id, label, iconValue });
  const tileClassName = cn(
    "sf-next-category-tile group flex h-[4.85rem] w-[5.05rem] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-[0.875rem] border text-center transition duration-200 active:scale-[0.98]",
    isPlain && "sf-next-category-tile--plain h-auto rounded-none border-0 bg-transparent shadow-none active:scale-100",
    active ? "is-active" : "opacity-95",
    className,
  );

  return (
    <UnifiedButton
      ref={btnRef}
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={tileClassName}
    >
      <span
        className={cn(
          "sf-next-category-tile-icon flex h-10 w-10 shrink-0 items-center justify-center",
          isPlain && "sf-next-category-tile-icon--plain",
        )}
      >
        <HomeNavIcon
          value={resolvedIconValue}
          className={isPlain ? "sf-next-category-icon-renderer--plain" : undefined}
          imageClassName={isPlain ? "sf-next-category-tile-image--plain" : undefined}
        />
      </span>
      <span
        className={cn(
          "sf-next-category-tile-label w-full truncate px-1 text-xs font-medium leading-tight",
          isPlain && "sf-next-category-tile-label--plain",
          active && "font-semibold",
        )}
      >
        {label}
      </span>
    </UnifiedButton>
  );
}

function resolveCategoryTileIconValue({
  id,
  label,
  iconValue,
}: {
  id?: string;
  label: string;
  iconValue: string;
}): string {
  const raw = iconValue.trim();
  if (raw && (isHomeNavImageIcon(raw) || isHomeNavIconToken(raw))) return raw;

  const hint = `${id || ""} ${label} ${raw}`.toLowerCase();
  if (hint.includes("all") || hint.includes("全部")) return "all";
  if (hint.includes("new") || hint.includes("新品") || hint.includes("上新")) return "new";
  if (hint.includes("hot") || hint.includes("热销") || hint.includes("爆款")) return "hot";
  if (hint.includes("coupon") || hint.includes("优惠") || hint.includes("券")) return "coupon";
  if (hint.includes("gift") || hint.includes("礼")) return "gift";
  if (hint.includes("local") || hint.includes("本地")) return "local";
  if (hint.includes("service") || hint.includes("support") || hint.includes("客服")) return "support";
  if (hint.includes("order") || hint.includes("订单")) return "order";
  if (hint.includes("wine") || hint.includes("酒")) return "wine";
  if (hint.includes("smoke") || hint.includes("cigarette") || hint.includes("v10") || hint.includes("烟")) return "tobacco";
  return "category";
}
