import { cn } from "@/lib/utils";
import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useAdminT } from "@/hooks/useAdminT";
import { useModalStackSignal } from "@/modules/micro-interactions/modal/ModalLayerProvider";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type PanelPosition = {
  top: number;
  left: number;
  width: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
  ariaLabel?: string;
};

const MOBILE_BREAKPOINT = 640;
const VIEWPORT_PADDING = 12;
const PANEL_GAP = 8;

function computePosition(anchor: HTMLElement): PanelPosition {
  const rect = anchor.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const isMobile = viewportWidth < MOBILE_BREAKPOINT;

  if (isMobile) {
    return {
      top: 0,
      left: VIEWPORT_PADDING,
      width: viewportWidth - VIEWPORT_PADDING * 2,
    };
  }

  const panelWidth = Math.min(360, viewportWidth - VIEWPORT_PADDING * 2);
  let left = rect.right - panelWidth;
  left = Math.max(VIEWPORT_PADDING, Math.min(left, viewportWidth - panelWidth - VIEWPORT_PADDING));

  const estimatedHeight = 160;
  const spaceBelow = window.innerHeight - rect.bottom;
  const placeAbove = spaceBelow < estimatedHeight + PANEL_GAP && rect.top > estimatedHeight + PANEL_GAP;
  const top = placeAbove ? rect.top - estimatedHeight - PANEL_GAP : rect.bottom + PANEL_GAP;

  return { top: Math.max(VIEWPORT_PADDING, top), left, width: panelWidth };
}

export default function AnchoredPopover({
  open,
  onClose,
  anchorRef,
  children,
  className,
  panelClassName,
  ariaLabel = "弹出面板",
}: Props) {
  const { tText } = useAdminT();
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const { stackDepth, version: modalStackVersion } = useModalStackSignal();
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT,
  );

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    setPosition(computePosition(anchor));
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open || isMobile) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [open, isMobile, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onLayoutChange = () => {
      if (!isMobile) updatePosition();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
    };
  }, [open, onClose, isMobile, updatePosition]);

  useEffect(() => {
    if (open && stackDepth > 0) onClose();
  }, [modalStackVersion, onClose, open, stackDepth]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={cn("fixed inset-0 z-[70]", className)} role="presentation">
      <UnifiedButton
        type="button"
        aria-label={tText("关闭")}
        className="absolute inset-0 cursor-default bg-black/20"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label={ariaLabel}
        aria-modal="true"
        className={cn(
          "absolute z-[71] rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]",
          isMobile
            ? "bottom-[max(12px,env(safe-area-inset-bottom))] left-3 right-3 top-auto w-auto max-w-none"
            : "",
          panelClassName,
        )}
        style={
          isMobile || !position
            ? undefined
            : {
                top: position.top,
                left: position.left,
                width: position.width,
              }
        }
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
