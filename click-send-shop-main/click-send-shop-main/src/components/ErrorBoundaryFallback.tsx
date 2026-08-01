import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import "@/styles/fixed-storefront-overlays.css";
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
    <main className="sf-fixed-error-page">
      <section className="sf-fixed-error-state" aria-labelledby="app-error-title">
        <div className="sf-fixed-error-state__icon" aria-hidden>
          <AlertTriangle size={24} />
        </div>
        <div className="sf-fixed-error-state__copy">
          <h1 id="app-error-title">{title}</h1>
          <p>{message}</p>
        </div>
        {details ? (
          <p className="sf-fixed-error-state__details">
            {details}
          </p>
        ) : null}
        <div className="sf-fixed-error-state__actions">
          <UnifiedButton
            type="button"
            onClick={onReload}
            className="sf-fixed-overlay-action is-primary"
          >
            <RefreshCw size={16} aria-hidden /> {refreshLabel}
          </UnifiedButton>
          <a href={homeHref} className="sf-fixed-overlay-action">
            <Home size={16} aria-hidden /> {homeLabel}
          </a>
        </div>
      </section>
    </main>
  );
}
