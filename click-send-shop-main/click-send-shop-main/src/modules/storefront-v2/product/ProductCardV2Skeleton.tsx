import { Skeleton } from "@/components/ui/skeleton";
import { storefrontCardClassName } from "../design/classes";

type ProductCardV2SkeletonProps = {
  variant?: "grid" | "list";
};

export default function ProductCardV2Skeleton({ variant = "grid" }: ProductCardV2SkeletonProps) {
  if (variant === "list") {
    return (
      <div className={`${storefrontCardClassName()} flex gap-3 p-3`} aria-hidden>
        <Skeleton className="h-24 w-24 shrink-0 rounded-xl" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-auto h-5 w-24" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${storefrontCardClassName()} overflow-hidden`} aria-hidden>
      <Skeleton className="aspect-square w-full" />
      <div className="space-y-2 p-2.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
  );
}
