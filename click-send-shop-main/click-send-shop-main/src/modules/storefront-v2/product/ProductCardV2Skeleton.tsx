import { Skeleton } from "@/components/ui/skeleton";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import { storefrontCardClassName } from "../design/classes";

type ProductCardV2SkeletonProps = {
  variant?: "grid" | "list";
};

export default function ProductCardV2Skeleton({ variant = "grid" }: ProductCardV2SkeletonProps) {
  if (variant === "list") {
    return (
      <div className={`${storefrontCardClassName()} grid grid-cols-[5.75rem_minmax(0,1fr)] items-stretch gap-3 p-2.5 sm:grid-cols-[6rem_minmax(0,1fr)] sm:p-3`} aria-hidden>
        <Skeleton className="h-full min-h-[5.75rem] w-full self-stretch rounded-[0.875rem] sm:min-h-24" />
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
    <div className={`${storefrontCardClassName()} overflow-hidden p-1.5`} aria-hidden>
      <Skeleton className="w-full rounded-[0.95rem]" style={THEME_PRODUCT_MEDIA_ASPECT_STYLE} />
      <div className="space-y-2 px-1.5 pb-2 pt-3 sm:px-2">
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
