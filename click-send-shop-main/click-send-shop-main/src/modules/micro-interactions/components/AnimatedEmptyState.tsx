import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AnimatedSection } from "./AnimatedSection";

type AnimatedEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function AnimatedEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: AnimatedEmptyStateProps) {
  return (
    <AnimatedSection
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--theme-secondary)] text-[var(--theme-primary)]">
        <Icon size={22} aria-hidden />
      </div>
      <h3 className="text-sm font-semibold text-[var(--theme-text)]">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-xs text-[var(--theme-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </AnimatedSection>
  );
}

export default AnimatedEmptyState;
