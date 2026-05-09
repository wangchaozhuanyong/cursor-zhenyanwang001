import { Skeleton } from "@/components/ui/skeleton";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";

export default function ProductCardSkeleton() {
  const { themeConfig } = useThemeRuntime();
  const cardCenter = themeConfig.cardTextAlign === "center";
  return (
    <div className="theme-product-card overflow-hidden theme-rounded">
      <Skeleton className="w-full" style={{ aspectRatio: "var(--theme-image-ratio)" }} />
      <div className={`p-3 space-y-2 ${cardCenter ? "flex flex-col items-center" : ""}`}>
        <Skeleton className={`h-4 ${cardCenter ? "w-4/5" : "w-full"}`} />
        <Skeleton className={`h-4 ${cardCenter ? "w-3/5" : "w-2/3"}`} />
        <div
          className={`flex gap-2 pt-1 ${cardCenter ? "items-center justify-center" : "items-end justify-between"}`}
        >
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </div>
  );
}
