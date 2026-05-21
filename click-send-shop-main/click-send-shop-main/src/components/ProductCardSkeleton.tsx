import { Skeleton } from "@/components/ui/skeleton";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { cn } from "@/lib/utils";

interface ProductCardSkeletonProps {
  list?: boolean;
}

export default function ProductCardSkeleton({ list = false }: ProductCardSkeletonProps) {
  const { themeConfig } = useThemeRuntime();
  const cardCenter = themeConfig.cardTextAlign === "center";
  const cardVariant = themeConfig.productCardVariant ?? "standard";

  if (list || cardVariant === "compact") {
    return (
      <div className="theme-product-card overflow-hidden theme-rounded p-3 transform-gpu" aria-hidden>
        <div className="flex gap-3">
          <Skeleton className={cn("theme-rounded shrink-0", list ? "h-28 w-28" : "h-24 w-24")} />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/5" />
            <div className="mt-auto space-y-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isPremium = cardVariant === "premium";

  return (
    <div className="theme-product-card overflow-hidden theme-rounded transform-gpu" aria-hidden>
      <Skeleton className="w-full" style={{ aspectRatio: isPremium ? "1 / 1" : "var(--theme-image-ratio)" }} />
      <div className={`p-3 space-y-2 ${isPremium ? "p-3.5" : ""} ${cardCenter ? "flex flex-col items-center" : ""}`}>
        <Skeleton className={`h-4 ${cardCenter ? "w-4/5" : "w-full"}`} />
        <Skeleton className={`h-4 ${cardCenter ? "w-3/5" : "w-2/3"}`} />
        <div
          className={`flex gap-2 pt-1 ${cardCenter ? "items-center justify-center" : "items-end justify-between"}`}
        >
          <Skeleton className={`${isPremium ? "h-7 w-24" : "h-6 w-20"}`} />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
    </div>
  );
}
