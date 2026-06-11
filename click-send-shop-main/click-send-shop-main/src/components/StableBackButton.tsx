import { ArrowLeft } from "lucide-react";

import { useStableBack } from "@/hooks/useStableBack";
import { cn } from "@/lib/utils";

type StableBackButtonProps = {
  fallbackPath: string;
  targetPath?: string;
  label?: string;
  className?: string;
};

export function StableBackButton({
  fallbackPath,
  targetPath,
  label = "返回上一页",
  className,
}: StableBackButtonProps) {
  const stableBack = useStableBack({
    fallbackPath,
    targetPath,
  });

  return (
    <button
      type="button"
      onClick={stableBack}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
