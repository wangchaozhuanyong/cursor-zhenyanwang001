import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-base skeleton-shimmer sf-next-theme-radius", className)}
      {...props}
    />
  );
}

export { Skeleton };
