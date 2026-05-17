import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { subscribeGlobalLoading } from "@/lib/loadingProgress";

type BarState = { progress: number; visible: boolean; animatingOut: boolean };

const INITIAL_STATE: BarState = { progress: 0, visible: false, animatingOut: false };

export function TopProgressBar() {
  const [state, setState] = useState<BarState>(INITIAL_STATE);

  useEffect(() => subscribeGlobalLoading(setState), []);

  if (!state.visible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[120] h-[2px]",
        state.animatingOut ? "opacity-0" : "opacity-100",
      )}
      style={{ transition: "opacity 260ms ease-in-out" }}
      aria-hidden="true"
    >
      <div
        className="h-full"
        style={{
          width: `${Math.min(state.progress * 100, 100)}%`,
          backgroundColor: "var(--theme-primary, hsl(var(--primary)))",
          transition: "width 220ms ease-in-out",
        }}
      />
    </div>
  );
}

export function RouterLoadingBridge() {
  // Keep component for backward compatibility; route change no longer forces global loading bar.
  return null;
}
