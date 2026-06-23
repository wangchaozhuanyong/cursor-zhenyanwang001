import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatusTimelineItem = {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  time?: ReactNode;
  state: "complete" | "current" | "upcoming";
};

export type StatusTimelineProps = {
  items: readonly StatusTimelineItem[];
  className?: string;
};

/**
 * Read-only timeline for logistics and returns.
 * The page adapter must map existing backend states to the visual state.
 */
export default function StatusTimeline({ items, className }: StatusTimelineProps) {
  return (
    <ol className={cn("sf-next-timeline", className)}>
      {items.map((item) => (
        <li key={item.id} className="sf-next-timeline__item" data-state={item.state}>
          <span className="sf-next-timeline__marker" aria-hidden="true" />

          <div className="sf-next-timeline__content">
            <h3 className="sf-next-timeline__title">{item.title}</h3>

            {item.description ? (
              <p className="sf-next-timeline__description">{item.description}</p>
            ) : null}
          </div>

          {item.time ? <time className="sf-next-timeline__time">{item.time}</time> : null}
        </li>
      ))}
    </ol>
  );
}
