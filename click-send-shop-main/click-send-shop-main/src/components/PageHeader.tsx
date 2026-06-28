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
              "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-0 text-[var(--theme-text)] transition hover:bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] active:scale-95",
              backButtonClassName,
            )
          : cn(
              "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-0 text-[var(--theme-text)] transition hover:bg-[color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] active:scale-95",
              backButtonClassName,
            )
      }
    >
      <ArrowLeft size={20} strokeWidth={2.25} />
    </UnifiedButton>
  );

  return (
    <header className={cn("sf-next-page-header header-safe-top sf-next-glass-surface sticky top-0 z-header border-b backdrop-blur-xl", className)}>
      <div className={cn("sf-next-page-header__inner relative mx-auto flex h-11 w-full max-w-screen-xl items-center justify-between gap-2 px-[var(--store-header-x)]", contentClassName)}>
        {hasRightSlot ? (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {backButton}
              <h1 className="sf-next-page-title min-w-0 truncate">{title}</h1>
            </div>
            <div className="shrink-0">{rightSlot}</div>
          </>
        ) : (
          <div className="grid w-full min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-1">
            <div className="flex min-w-0 items-center justify-start">{backButton}</div>
            <h1 className="sf-next-page-title min-w-0 truncate text-center">{title}</h1>
            <div className="h-11 w-11" aria-hidden />
          </div>
        )}
      </div>
    </header>
  );
}
