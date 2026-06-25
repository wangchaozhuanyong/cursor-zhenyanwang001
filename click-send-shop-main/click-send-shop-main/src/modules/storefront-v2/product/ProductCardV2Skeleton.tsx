import { Skeleton } from "@/components/ui/skeleton";

type ProductCardV2SkeletonProps = {
  variant?: "grid" | "list";
};

export default function ProductCardV2Skeleton({ variant = "grid" }: ProductCardV2SkeletonProps) {
  if (variant === "list") {
    return (
      <div className="sf-next-product-card sf-next-product-card--list sf-next-product-card--skeleton grid grid-cols-[5.75rem_minmax(0,1fr)] items-stretch gap-3" aria-hidden>
        <Skeleton className="sf-next-product-card__media h-full min-h-[5.75rem] w-full self-stretch sm:min-h-24" />
        <div className="flex min-h-[5.75rem] flex-col gap-2 py-1 sm:min-h-24">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-32" />
          <div className="mt-auto flex items-end justify-between gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-7 w-14 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sf-next-product-card sf-next-product-card--grid sf-next-product-card--skeleton" aria-hidden>
      <Skeleton className="sf-next-product-card__media" />
      <div className="space-y-2 pt-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-28" />
        <div className="flex items-end justify-between gap-2 pt-1">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
      </div>
    </div>
  );
}
