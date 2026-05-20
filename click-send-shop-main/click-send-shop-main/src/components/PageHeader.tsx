import { ArrowLeft } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";

interface PageHeaderProps {
  title: React.ReactNode;
  onBack?: () => void;
  backFallback?: string;
  rightSlot?: React.ReactNode;
}

export default function PageHeader({ title, onBack, backFallback, rightSlot }: PageHeaderProps) {
  const goBack = useGoBack(backFallback);

  return (
    <header className="header-safe-top sticky top-0 z-40 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack ?? goBack}
            aria-label="返回"
            className="touch-target flex items-center justify-center rounded-full hover:bg-secondary"
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
        </div>
        {rightSlot && <div>{rightSlot}</div>}
      </div>
    </header>
  );
}
