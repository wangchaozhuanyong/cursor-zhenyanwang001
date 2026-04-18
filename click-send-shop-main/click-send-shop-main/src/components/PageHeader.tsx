import { ArrowLeft } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";

interface PageHeaderProps {
  title: string;
  /** 自定义返回处理；不传则使用 useGoBack（智能 fallback 到首页 / Profile / Admin） */
  onBack?: () => void;
  /** 当无历史时的兜底路径 */
  backFallback?: string;
  rightSlot?: React.ReactNode;
}

export default function PageHeader({
  title,
  onBack,
  backFallback,
  rightSlot,
}: PageHeaderProps) {
  const goBack = useGoBack(backFallback);

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack ?? goBack}
            aria-label="返回"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary touch-target"
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
