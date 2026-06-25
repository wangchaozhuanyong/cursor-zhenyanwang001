import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/useCartStore";

export type StoreCartBadgeCountProps = {
  bumped?: boolean;
  className?: string;
  variant?: "header" | "bottom";
};

const BADGE_CLASS_BY_VARIANT: Record<NonNullable<StoreCartBadgeCountProps["variant"]>, string> = {
  header:
    "absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--theme-danger)] px-1 text-[10px] font-bold text-[var(--theme-danger-foreground)]",
  bottom:
    "absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--theme-danger)] px-1 text-[10px] font-bold text-[var(--theme-danger-foreground)]",
};

export default function StoreCartBadgeCount({
  bumped = false,
  className,
  variant = "header",
}: StoreCartBadgeCountProps) {
  const totalItems = useCartStore((s) => s.totalItems());
  if (totalItems <= 0) return null;

  return (
    <span className={cn(BADGE_CLASS_BY_VARIANT[variant], bumped && "sf-next-bottom-nav-badge-bump", className)}>
      {totalItems > 99 ? "99+" : totalItems}
    </span>
  );
}
