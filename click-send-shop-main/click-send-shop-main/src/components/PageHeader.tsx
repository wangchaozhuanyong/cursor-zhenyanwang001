import { ArrowLeft } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  onBack?: () => void;
  backFallback?: string;
  rightSlot?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  backButtonClassName?: string;
}

export default function PageHeader({
  title,
  onBack,
  backFallback,
  rightSlot,
  className,
  contentClassName,
  backButtonClassName,
}: PageHeaderProps) {
  const goBack = useGoBack(backFallback);
  const hasRightSlot = Boolean(rightSlot);

  const backButton = (
    <UnifiedButton
      type="button"
      onClick={onBack ?? goBack}
      aria-label="返回"
      className={
        hasRightSlot
          ? cn(
              "relative -ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-0 text-[var(--theme-text)] transition hover:bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] active:scale-95",
              backButtonClassName,
            )
          : cn(
              "absolute left-[calc(var(--store-header-x)-0.75rem)] top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full p-0 text-[var(--theme-text)] transition hover:bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] active:scale-95",
              backButtonClassName,
            )
      }
    >
      <ArrowLeft size={20} strokeWidth={2.25} />
    </UnifiedButton>
  );

  return (
    <header className={cn("header-safe-top store-glass-surface sticky top-0 z-header border-b backdrop-blur-xl", className)}>
      <div className={cn("relative mx-auto flex h-11 w-full max-w-screen-xl items-center justify-between gap-2 px-[var(--store-header-x)]", contentClassName)}>
        {hasRightSlot ? (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {backButton}
              <h1 className="store-page-title min-w-0 truncate">{title}</h1>
            </div>
            <div className="shrink-0">{rightSlot}</div>
          </>
        ) : (
          <>
            {backButton}
            <h1 className="store-page-title mx-auto max-w-[calc(100%-7rem)] truncate text-center">{title}</h1>
          </>
        )}
      </div>
    </header>
  );
}
