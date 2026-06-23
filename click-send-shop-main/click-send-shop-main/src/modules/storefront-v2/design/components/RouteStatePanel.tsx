import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type RouteStatePanelProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  tone?: "neutral" | "success" | "error";
  className?: string;
};

/**
 * Shared empty / error / terminal-success state.
 * Loading states should use geometry-matched skeletons instead.
 */
export default function RouteStatePanel({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  tone = "neutral",
  className,
}: RouteStatePanelProps) {
  return (
    <section className={cn("sf-next-route-state", className)} data-tone={tone}>
      {icon ? <div className="sf-next-route-state__icon">{icon}</div> : null}

      <h2 className="sf-next-route-state__title">{title}</h2>

      {description ? <p className="sf-next-route-state__description">{description}</p> : null}

      {primaryAction || secondaryAction ? (
        <div className="sf-next-route-state__actions">
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}
    </section>
  );
}
