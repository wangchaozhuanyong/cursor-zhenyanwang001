import { ArrowLeft } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

interface PageHeaderProps {
  title: React.ReactNode;
  onBack?: () => void;
  backFallback?: string;
  rightSlot?: React.ReactNode;
}

export default function PageHeader({ title, onBack, backFallback, rightSlot }: PageHeaderProps) {
  const goBack = useGoBack(backFallback);

  return (
    <header className="header-safe-top sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-11 max-w-lg items-center justify-between gap-2 px-[var(--store-page-x)] sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <UnifiedButton
            type="button"
            onClick={onBack ?? goBack}
            aria-label="返回"
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-0 hover:bg-secondary active:scale-95"
          >
            <ArrowLeft size={20} strokeWidth={2.25} className="text-foreground" />
          </UnifiedButton>
          <h1 className="store-page-title min-w-0 truncate text-foreground">{title}</h1>
        </div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
    </header>
  );
}
