import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useMediaSheetMode } from "../hooks/useMediaSheetMode";
import { useMotionConfig } from "../hooks/useMotionConfig";
import { modalTransition } from "../motionConfig";
import { BottomSheet, type BottomSheetHeight, type BottomSheetProps } from "./BottomSheet";

export type ResponsiveSheetProps = Omit<BottomSheetProps, "desktopMaxWidthClass"> & {
  /** 桌面 Dialog 最大宽度 class */
  dialogClassName?: string;
};

/**
 * 移动端 Bottom Sheet；桌面端居中 Dialog（主流电商 PC 做法）。
 */
export function ResponsiveSheet({
  open,
  onClose,
  title,
  description,
  footer,
  height = "auto",
  children,
  showHandle,
  showCloseButton,
  closeOnOverlay = true,
  stickyFooter,
  className,
  dialogClassName,
}: ResponsiveSheetProps) {
  const mobile = useMediaSheetMode();
  const { level, enabled } = useMotionConfig();
  const modal = modalTransition(level);

  if (mobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title={title}
        description={description}
        footer={footer}
        height={height}
        showHandle={showHandle}
        showCloseButton={showCloseButton}
        closeOnOverlay={closeOnOverlay}
        stickyFooter={stickyFooter}
        className={className}
      >
        {children}
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          "max-h-[min(85vh,720px)] overflow-hidden border-[var(--theme-border)] bg-[var(--theme-surface)] p-0 text-[var(--theme-text)] sm:max-w-lg",
          dialogClassName,
        )}
        onPointerDownOutside={() => closeOnOverlay && onClose()}
      >
        {enabled ? (
          <motion.div
            className="flex max-h-[min(85vh,720px)] flex-col"
            initial={modal.content.initial}
            animate={modal.content.animate}
            exit={modal.content.exit}
            transition={modal.transition}
          >
            <SheetDialogBody
              title={title}
              description={description}
              footer={footer}
              stickyFooter={stickyFooter}
            >
              {children}
            </SheetDialogBody>
          </motion.div>
        ) : (
          <SheetDialogBody
            title={title}
            description={description}
            footer={footer}
            stickyFooter={stickyFooter}
          >
            {children}
          </SheetDialogBody>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SheetDialogBody({
  title,
  description,
  footer,
  stickyFooter,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  stickyFooter?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {title || description ? (
        <DialogHeader className="shrink-0 space-y-1 border-b border-[var(--theme-border)] px-5 py-4 text-left">
          {title ? (
            <DialogTitle className="text-base font-semibold text-[var(--theme-text)]">{title}</DialogTitle>
          ) : null}
          {description ? (
            <DialogDescription className="text-sm text-[var(--theme-text-muted)]">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
      ) : null}
      <motion.div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4",
          !stickyFooter && "pb-5",
        )}
      >
        {children}
      </motion.div>
      {footer ? (
        <div className="shrink-0 border-t border-[var(--theme-border)] px-5 py-4">{footer}</div>
      ) : null}
    </>
  );
}

export type { BottomSheetHeight };
