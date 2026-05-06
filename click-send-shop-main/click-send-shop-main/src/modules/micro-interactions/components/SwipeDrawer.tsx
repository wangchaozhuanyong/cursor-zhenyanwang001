import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export type SwipeDrawerProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Accessible label for the dialog surface */
  title?: string;
  className?: string;
};

const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18, ease: "easeOut" },
} as const;

const sheetMotion = {
  transition: { type: "spring", stiffness: 420, damping: 34 },
} as const;

/**
 * Bottom sheet with y-drag physics, frosted scrim, and theme-driven radii/colors.
 */
export function SwipeDrawer({
  open,
  onClose,
  children,
  title = "操作面板",
  className,
}: SwipeDrawerProps) {
  const dragControls = useDragControls();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const constraints = useMemo(() => {
    const h = typeof window !== "undefined" ? window.innerHeight : 640;
    return { top: 0, bottom: Math.max(240, Math.round(h * 0.75)) };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80]">
          <motion.button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            {...overlayMotion}
            onClick={onClose}
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              "absolute inset-x-0 bottom-0 z-[81] flex max-h-[min(88dvh,920px)] flex-col overflow-hidden",
              "border border-[var(--theme-border)]",
              className,
            )}
            style={{
              borderTopLeftRadius: "var(--theme-radius)",
              borderTopRightRadius: "var(--theme-radius)",
              backgroundColor: "var(--theme-surface)",
              color: "var(--theme-text-on-surface)",
              boxShadow: "var(--theme-shadow-hover)",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={sheetMotion.transition}
          >
            <motion.div
              className="flex min-h-0 flex-1 flex-col"
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={constraints}
              dragElastic={{ top: 0, bottom: 0.2 }}
              dragMomentum={false}
              dragSnapToOrigin
              onDragEnd={(_, info) => {
                const h = typeof window !== "undefined" ? window.innerHeight : 640;
                const distanceClose = info.offset.y > h * 0.2;
                const flickClose = info.velocity.y > 900;
                if (distanceClose || flickClose) onClose();
              }}
            >
              <div className="flex shrink-0 flex-col items-center pt-3">
                <button
                  type="button"
                  className="flex w-full flex-col items-center pb-2 outline-none"
                  aria-label="拖拽调整面板"
                  onPointerDown={(e) => dragControls.start(e)}
                >
                  <span className="h-1.5 w-12 rounded-full bg-[var(--theme-border)]" />
                </button>
                <div id={titleId} className="sr-only">
                  {title}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(env(safe-area-inset-bottom),12px)]">
                {children}
              </div>
            </motion.div>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
