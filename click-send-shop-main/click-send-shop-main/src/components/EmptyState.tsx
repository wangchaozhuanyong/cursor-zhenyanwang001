import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-md flex-col items-center rounded-[calc(var(--theme-radius)+8px)] border border-[var(--theme-border)] bg-[var(--theme-surface)]/82 px-6 py-12 text-center shadow-[var(--theme-shadow)]",
        className,
      )}
      role="status"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-primary)] shadow-sm">
        <Icon size={30} aria-hidden />
      </span>
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      {description && <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {action && (
        <UnifiedButton
          type="button"
          onClick={action.onClick}
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full btn-theme-price px-6 text-sm font-semibold text-[var(--theme-price-foreground)] transition hover:brightness-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-price)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg)]"
        >
          {action.label}
        </UnifiedButton>
      )}
    </div>
  );
}
