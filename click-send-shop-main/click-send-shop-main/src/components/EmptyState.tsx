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
        "mx-auto flex min-h-56 w-full max-w-md flex-col items-center justify-center px-6 py-10 text-center",
        className,
      )}
      role="status"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--sf-primary-soft)] text-[var(--theme-primary)]">
        <Icon size={24} aria-hidden />
      </span>
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      {description && <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {action && (
        <UnifiedButton
          type="button"
          onClick={action.onClick}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--theme-primary)] px-6 text-sm font-semibold text-[var(--theme-primary-foreground)] transition hover:brightness-[1.02] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg)]"
        >
          {action.label}
        </UnifiedButton>
      )}
    </div>
  );
}
