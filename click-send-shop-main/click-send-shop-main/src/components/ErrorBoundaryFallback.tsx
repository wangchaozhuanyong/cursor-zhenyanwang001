import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type ErrorBoundaryFallbackProps = {
  title: string;
  message: string;
  details?: string;
  homeHref: string;
  homeLabel: string;
  refreshLabel: string;
  onReload: () => void;
};

export default function ErrorBoundaryFallback({
  title,
  message,
  details,
  homeHref,
  homeLabel,
  refreshLabel,
  onReload,
}: ErrorBoundaryFallbackProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-danger)_10%,var(--theme-surface))]">
        <AlertTriangle className="h-8 w-8 text-[var(--theme-danger)]" />
      </div>
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">
          {title}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground break-words">
          {message}
        </p>
        {details ? (
          <p className="mt-2 max-w-sm break-words rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            {details}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <UnifiedButton
          type="button"
          onClick={onReload}
          className="inline-flex items-center gap-2 rounded-full btn-theme-price px-6 py-3 text-sm font-bold text-[var(--theme-price-foreground)]"
        >
          <RefreshCw size={16} /> {refreshLabel}
        </UnifiedButton>
        <a
          href={homeHref}
          className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground"
        >
          <Home size={16} /> {homeLabel}
        </a>
      </div>
    </div>
  );
}
