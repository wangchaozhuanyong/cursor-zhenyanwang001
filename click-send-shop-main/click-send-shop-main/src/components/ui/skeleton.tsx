import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-base skeleton-shimmer theme-rounded", className)}
      {...props}
    />
  );
}

export { Skeleton };
