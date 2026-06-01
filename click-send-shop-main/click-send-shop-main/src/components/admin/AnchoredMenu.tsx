import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useModalStackSignal } from "@/modules/micro-interactions/modal/ModalLayerProvider";

type Props = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  width?: number;
  gap?: number;
  viewportPadding?: number;
  placement?: "side" | "bottom-end";
  className?: string;
  children: ReactNode;
};

type Pos = { x: number; y: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max));
}

function computePosition(args: {
  anchor: DOMRect;
  viewportWidth: number;
  viewportHeight: number;
  menuWidth: number;
  menuHeight: number;
  gap: number;
  viewportPadding: number;
  placement: "side" | "bottom-end";
}): Pos {
  const { anchor, viewportWidth, viewportHeight, menuWidth, menuHeight, gap, viewportPadding, placement } = args;

  const maxLeft = Math.max(viewportPadding, viewportWidth - menuWidth - viewportPadding);
  const maxTop = Math.max(viewportPadding, viewportHeight - menuHeight - viewportPadding);

  if (placement === "bottom-end") {
    const preferredLeft = anchor.right - menuWidth;
    const preferredTop = anchor.bottom + gap;
    const fallbackTop = anchor.top - menuHeight - gap;

    return {
      x: clamp(preferredLeft, viewportPadding, maxLeft),
      y: clamp(
        preferredTop + menuHeight <= viewportHeight - viewportPadding ? preferredTop : fallbackTop,
        viewportPadding,
        maxTop,
      ),
    };
  }

  const preferredLeft = anchor.right + gap;
  const fallbackLeft = anchor.left - menuWidth - gap;
  const left =
    preferredLeft + menuWidth <= viewportWidth - viewportPadding
      ? preferredLeft
      : Math.max(viewportPadding, fallbackLeft);

  const preferredTop = anchor.top;
  const fallbackTop = anchor.bottom - menuHeight;
  const top =
    preferredTop + menuHeight <= viewportHeight - viewportPadding
      ? preferredTop
      : Math.max(viewportPadding, fallbackTop);

  return {
    x: clamp(left, viewportPadding, maxLeft),
    y: clamp(top, viewportPadding, maxTop),
  };
}

export default function AnchoredMenu({
  open,
  onClose,
  anchorRef,
  width = 160,
  gap = 6,
  viewportPadding = 8,
  placement = "side",
  className,
  children,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuHeight, setMenuHeight] = useState<number>(176);
  const [pos, setPos] = useState<Pos | null>(null);
  const { stackDepth, version: modalStackVersion } = useModalStackSignal();

  const place = () => {
    const anchorEl = anchorRef.current;
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const h = menuRef.current?.getBoundingClientRect().height || menuHeight;
    setPos(
      computePosition({
        anchor: rect,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        menuWidth: width,
        menuHeight: h,
        gap,
        viewportPadding,
        placement,
      }),
    );
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, width, gap, viewportPadding, placement]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = menuRef.current;
    if (!el) return;
    const h = el.getBoundingClientRect().height;
    if (Number.isFinite(h) && h > 0 && Math.abs(h - menuHeight) > 1) {
      setMenuHeight(h);
    }
  }, [menuHeight, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDoc = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (anchorRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onClose();
    };
    const onLayoutChange = () => place();
    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);
    window.addEventListener("click", onDoc);
    window.addEventListener("contextmenu", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
      window.removeEventListener("click", onDoc);
      window.removeEventListener("contextmenu", onDoc);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorRef, open, onClose, width, gap, viewportPadding, placement]);

  useEffect(() => {
    if (!open) {
      setPos(null);
    } else {
      place();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuHeight, open]);

  useEffect(() => {
    if (open && stackDepth > 0) onClose();
  }, [modalStackVersion, onClose, open, stackDepth]);

  if (!open || !pos || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      className={cn(
        "fixed z-[60] rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] py-1 text-sm shadow-lg",
        className,
      )}
      style={{ left: pos.x, top: pos.y, width }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      role="menu"
    >
      {children}
    </div>,
    document.body,
  );
}
