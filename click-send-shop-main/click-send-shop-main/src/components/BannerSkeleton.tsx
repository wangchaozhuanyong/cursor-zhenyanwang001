import { Skeleton } from "@/components/ui/skeleton";

export default function BannerSkeleton() {
  return (
    <div className="mx-4">
      <Skeleton className="w-full rounded-2xl" style={{ aspectRatio: "2.34 / 1" }} />
    </div>
  );
}
