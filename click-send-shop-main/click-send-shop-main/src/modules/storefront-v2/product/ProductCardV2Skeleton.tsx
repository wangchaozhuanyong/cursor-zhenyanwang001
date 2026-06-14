import { Skeleton } from "@/components/ui/skeleton";
import { THEME_PRODUCT_MEDIA_ASPECT_STYLE } from "@/constants/productMediaAspect";
import { storefrontCardClassName } from "../design/classes";

type ProductCardV2SkeletonProps = {
  variant?: "grid" | "list";
};

export default function ProductCardV2Skeleton({ variant = "grid" }: ProductCardV2SkeletonProps) {
  if (variant === "list") {
    return (
      <div className={`${storefrontCardClassName()} flex gap-3 p-2.5 sm:p-3`} aria-hidden>
        <Skeleton className="w-[5.25rem] shrink-0 self-start rounded-[0.875rem] sm:w-24" style={THEME_PRODUCT_MEDIA_ASPECT_STYLE} />
        <div className="flex flex-1 flex-col gap-2">
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
