import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useDragControls, type Transition } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOverlayDismiss } from "../hooks/useOverlayDismiss";
import { useModalLayer } from "../modal/ModalLayerProvider";
import { prefersReducedMotion } from "../motionConfig";
import { useMotionConfig } from "../hooks/useMotionConfig";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

export type BottomSheetHeight = "auto" | "50vh" | "70vh" | "90vh" | "full";

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  height?: BottomSheetHeight;
  showHandle?: boolean;
  showCloseButton?: boolean;
  closeOnOverlay?: boolean;
  stickyFooter?: boolean;
  className?: string;
  ariaLabel?: string;
  /** 桌面贴底居中最大宽度 */
  desktopMaxWidthClass?: string;
};

const HEIGHT_CLASS: Record<BottomSheetHeight, string> = {
  auto: "max-h-[min(88dvh,920px)]",
  "50vh": "max-h-[50dvh]",
  "70vh": "max-h-[70dvh]",
  "90vh": "max-h-[90dvh]",
  full: "max-h-[96dvh]",
};

const DRAG_CLOSE_PX = 80;

export function BottomSheet({
  open,
  onClose,
  children,
  title,
  description,
  footer,
  height = "auto",
  showHandle = true,
  showCloseButton = true,
  closeOnOverlay = true,
  stickyFooter = Boolean(footer),
  className,
  ariaLabel,
  desktopMaxWidthClass = "md:max-w-[520px] md:mx-auto md:left-0 md:right-0",
}: BottomSheetProps) {
  const dragControls = useDragControls();
  const titleId = useId();
  const descId = useId();
  const { enabled: motionEnabled } = useMotionConfig();
  const reduced = prefersReducedMotion() || !motionEnabled;
  const [presented, setPresented] = useState(open);
  const { overlayZ, contentZ, isTop } = useModalLayer(presented);

  useOverlayDismiss({ open: presented, isTop, onClose, lockBody: true, closeOnEscape: open });

  useEffect(() => {
    if (open) setPresented(true);
  }, [open]);

  useEffect(() => {
    if (!open || title || ariaLabel || !import.meta.env.DEV) return;
    // 开发期提醒即可，避免为了可访问性保护破坏现有弹层调用方。
    console.warn("[BottomSheet] 缺少标题或 ariaLabel，请为弹层补充可访问名称。");
  }, [ariaLabel, open, title]);

  const overlayTransition: Transition = reduced
    ? { duration: 0.12 }
    : { duration: 0.24, ease: "easeOut" };

  const sheetTransition: Transition = reduced
    ? { duration: 0.12 }
    : { duration: 0.28, ease: "easeOut" };

  const dragConstraints = useMemo(() => ({ top: 0, bottom: 0 }), []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence onExitComplete={() => setPresented(false)}>
      {presented ? (
        <motion.div
          className="fixed inset-0"
          style={{ zIndex: overlayZ, pointerEvents: open ? "auto" : "none" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: open ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={overlayTransition}
          onAnimationComplete={() => {
            if (!open) setPresented(false);
          }}
        >
          <motion.button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: open ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={overlayTransition}
            onClick={closeOnOverlay ? onClose : undefined}
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={!title ? (ariaLabel || "弹窗") : undefined}
            aria-describedby={description ? descId : undefined}
            className={cn(
              "absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[22px] border border-b-0 border-[var(--theme-border)]",
              HEIGHT_CLASS[height],
              desktopMaxWidthClass,
              className,
            )}
            style={{
              zIndex: contentZ,
              background: "var(--theme-surface)",
              color: "var(--theme-text)",
              boxShadow: "var(--theme-shadow-hover)",
            }}
            initial={reduced ? { opacity: 0 } : { y: "100%" }}
            animate={open ? (reduced ? { opacity: 1 } : { y: 0 }) : (reduced ? { opacity: 0 } : { y: "100%" })}
            exit={reduced ? { opacity: 0 } : { y: "100%" }}
            transition={sheetTransition}
          >
            <motion.div
              className="flex min-h-0 flex-1 flex-col"
              drag={reduced ? false : "y"}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={dragConstraints}
              dragElastic={{ top: 0, bottom: 0.15 }}
              dragMomentum={false}
              onDragEnd={(_, info) => {
                if (reduced) return;
                if (info.offset.y > DRAG_CLOSE_PX || info.velocity.y > 720) {
                  onClose();
                }
              }}
            >
              {showHandle ? (
                <UnifiedButton
                  type="button"
                  className="flex w-full shrink-0 flex-col items-center pb-1 pt-3 outline-none"
                  aria-label="向下拖动关闭"
                  onPointerDown={(e) => dragControls.start(e)}
                >
                  <span className="h-1 w-10 rounded-full bg-[var(--theme-border)]" />
                </UnifiedButton>
              ) : null}

              {(title || showCloseButton) && (
                <motion.div
                  className="flex shrink-0 items-start justify-between gap-3 px-4 pb-2 pt-1"
                  drag={false}
                >
                  <motion.div className="min-w-0 flex-1" drag={false}>
                    {title ? (
                      <h2 id={titleId} className="text-base font-semibold text-[var(--theme-text)]">
                        {title}
                      </h2>
                    ) : null}
                    {description ? (
                      <p id={descId} className="mt-1 text-sm text-[var(--theme-text-muted)]">
                        {description}
                      </p>
                    ) : null}
                  </motion.div>
                  {showCloseButton ? (
                    <UnifiedButton
                      type="button"
                      onClick={onClose}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--theme-border)] text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-bg)]"
                      aria-label="关闭"
                    >
                      <X size={18} />
                    </UnifiedButton>
                  ) : null}
                </motion.div>
              )}

              {children ? (
                <motion.div
                  className={cn(
                    "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2",
                    !stickyFooter && "pb-[max(12px,env(safe-area-inset-bottom))]",
                  )}
                >
                  {children}
                </motion.div>
              ) : null}

              {footer ? (
                <motion.div
                  className={cn(
                    "shrink-0 border-t border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3",
                    "pb-[max(12px,env(safe-area-inset-bottom))]",
                  )}
                >
                  {footer}
                </motion.div>
              ) : null}
            </motion.div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
