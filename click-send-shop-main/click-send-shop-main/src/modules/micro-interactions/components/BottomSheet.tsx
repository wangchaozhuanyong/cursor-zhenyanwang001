import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useDragControls, type Transition } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOverlayDismiss } from "../hooks/useOverlayDismiss";
import { useModalLayer } from "../modal/ModalLayerProvider";
import { prefersReducedMotion, SILK_EASE } from "../motionConfig";
import { useMotionConfig } from "../hooks/useMotionConfig";
import { retainBottomSheetVisualState } from "../modal/bottomSheetVisualState";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

export type BottomSheetHeight = "auto" | "50vh" | "70vh" | "90vh" | "full";

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  height?: BottomSheetHeight;
  showHandle?: boolean;
  showCloseButton?: boolean;
  closeButtonPlacement?: "inside" | "outside";
  closeButtonClassName?: string;
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
const DRAG_CLOSE_VELOCITY = 720;

function hasAccessibleTitle(title: ReactNode): boolean {
  return title !== null && title !== undefined && title !== false && title !== "";
}

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
  closeButtonPlacement = "inside",
  closeButtonClassName,
  closeOnOverlay = true,
  stickyFooter = Boolean(footer),
  className,
  ariaLabel,
  desktopMaxWidthClass = "lg:max-w-[520px] lg:mx-auto lg:left-0 lg:right-0",
}: BottomSheetProps) {
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();
  const { enabled: motionEnabled, level } = useMotionConfig();
  const reduced = prefersReducedMotion() || !motionEnabled;
  const [presented, setPresented] = useState(open);
  const { overlayZ, contentZ, isTop } = useModalLayer(presented);
  const hasTitle = hasAccessibleTitle(title);

  useOverlayDismiss({
    open: presented,
    isTop,
    onClose,
    lockBody: true,
    closeOnEscape: open,
    contentRef: sheetRef,
    trapFocus: true,
  });

  useEffect(() => {
    if (open) setPresented(true);
  }, [open]);

  useEffect(() => {
    if (!presented) return;
    return retainBottomSheetVisualState();
  }, [presented]);

  useEffect(() => {
    if (!open || title || ariaLabel || !import.meta.env.DEV) return;
    // 开发期提醒即可，避免为了可访问性保护破坏现有弹层调用方。
    console.warn("[BottomSheet] 缺少标题或 ariaLabel，请为弹层补充可访问名称。");
  }, [ariaLabel, open, title]);

  const overlayTransition: Transition = reduced
    ? { duration: 0.12 }
    : { duration: level === "rich" ? 0.3 : 0.24, ease: SILK_EASE };

  const sheetTransition: Transition = reduced
    ? { duration: 0.12 }
    : { duration: level === "rich" ? 0.28 : 0.22, ease: SILK_EASE };

  const childInitial = reduced ? false : { opacity: 0, y: 10 };
  const childAnimate = open || reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 };
  const childExit = reduced ? { opacity: 0 } : { opacity: 0, y: 8 };
  const showInsideCloseButton = showCloseButton && closeButtonPlacement === "inside";
  const showOutsideCloseButton = showCloseButton && closeButtonPlacement === "outside";

  const dragConstraints = useMemo(() => ({ top: 0, bottom: 0 }), []);

  if (open && !hasTitle) {
    throw new Error("[BottomSheet] title is required for accessible modal content.");
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence onExitComplete={() => setPresented(false)}>
      {presented ? (
        <motion.div
          className="app-bottom-sheet-layer fixed inset-0"
          data-open={open ? "true" : "false"}
          style={{ zIndex: overlayZ, pointerEvents: open ? "auto" : "none" }}
          initial={false}
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
            className="app-bottom-sheet-backdrop absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: open ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={overlayTransition}
            onClick={closeOnOverlay ? onClose : undefined}
          />

          {showOutsideCloseButton ? (
            <UnifiedButton
              type="button"
              onClick={onClose}
              className={cn(
                "app-bottom-sheet-close absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border text-[var(--theme-text-muted)] transition",
                closeButtonClassName,
              )}
              style={{ zIndex: contentZ + 1 }}
              aria-label="关闭"
            >
              <X size={19} />
            </UnifiedButton>
          ) : null}

          <motion.section
            ref={sheetRef}
            role="dialog"
            data-open={open ? "true" : "false"}
            aria-modal="true"
            aria-labelledby={hasTitle ? titleId : undefined}
            aria-label={!title ? (ariaLabel || "弹窗") : undefined}
            aria-describedby={description ? descId : undefined}
            className={cn(
              "app-bottom-sheet absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[30px] border border-b-0",
              HEIGHT_CLASS[height],
              desktopMaxWidthClass,
              className,
            )}
            style={{
              zIndex: contentZ,
              color: "var(--theme-text)",
            }}
            initial={false}
            animate={open ? (reduced ? { opacity: 1 } : { y: 0 }) : (reduced ? { opacity: 0 } : { y: "102%" })}
            exit={reduced ? { opacity: 0 } : { y: "102%" }}
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
                if (info.offset.y > DRAG_CLOSE_PX || info.velocity.y > DRAG_CLOSE_VELOCITY) {
                  onClose();
                }
              }}
            >
              {showHandle ? (
                <UnifiedButton
                  type="button"
                  className="app-bottom-sheet-handle-button flex w-full shrink-0 flex-col items-center pb-1 pt-3 outline-none"
                  aria-label="向下拖动关闭"
                  onPointerDown={(e) => dragControls.start(e)}
                >
                  <span className="app-bottom-sheet-handle" />
                </UnifiedButton>
              ) : null}

              {(hasTitle || showInsideCloseButton) && (
                <motion.div
                  className="app-bottom-sheet-header flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-2"
                  drag={false}
                  initial={childInitial}
                  animate={childAnimate}
                  exit={childExit}
                  transition={{ duration: reduced ? 0 : 0.2, ease: SILK_EASE, delay: reduced ? 0 : 0.03 }}
                >
                  <motion.div className="min-w-0 flex-1" drag={false}>
                    {hasTitle ? (
                      <h2 id={titleId} className="app-bottom-sheet-title text-base font-semibold text-[var(--theme-text)]">
                        {title}
                      </h2>
                    ) : null}
                    {description ? (
                      <p id={descId} className="app-bottom-sheet-description mt-1 text-sm text-[var(--theme-text-muted)]">
                        {description}
                      </p>
                    ) : null}
                  </motion.div>
                  {showInsideCloseButton ? (
                    <UnifiedButton
                      type="button"
                      onClick={onClose}
                      className="app-bottom-sheet-close flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[var(--theme-text-muted)] transition"
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
                    "app-bottom-sheet-content min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-2",
                    !stickyFooter && "pb-[max(12px,env(safe-area-inset-bottom))]",
                  )}
                  initial={childInitial}
                  animate={childAnimate}
                  exit={childExit}
                  transition={{ duration: reduced ? 0 : 0.22, ease: SILK_EASE, delay: reduced ? 0 : 0.07 }}
                >
                  {children}
                </motion.div>
              ) : null}

              {footer ? (
                <motion.div
                  className={cn(
                    "app-bottom-sheet-footer shrink-0 border-t px-5 py-3",
                    "pb-[max(12px,env(safe-area-inset-bottom))]",
                  )}
                  initial={childInitial}
                  animate={childAnimate}
                  exit={childExit}
                  transition={{ duration: reduced ? 0 : 0.2, ease: SILK_EASE, delay: reduced ? 0 : 0.11 }}
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
