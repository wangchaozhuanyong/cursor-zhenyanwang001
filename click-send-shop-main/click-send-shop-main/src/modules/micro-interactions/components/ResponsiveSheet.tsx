import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AppModalTier, ModalPresentation } from "../modal/modalBreakpoints";
import { usePreferBottomSheet } from "../modal/usePreferBottomSheet";
import { useMotionConfig } from "../hooks/useMotionConfig";
import { modalTransition } from "../motionConfig";
import { BottomSheet, type BottomSheetHeight, type BottomSheetProps } from "./BottomSheet";
import {
  ModalDialog,
  ModalDialogDescription,
  ModalDialogHeader,
  ModalDialogTitle,
} from "./ModalDialog";

export type ResponsiveSheetProps = Omit<BottomSheetProps, "desktopMaxWidthClass"> & {
  /** 桌面 Dialog 最大宽度 class */
  dialogClassName?: string;
  /** 弹层档位（与 AppModal 一致） */
  tier?: AppModalTier;
  /** sheet | dialog | auto */
  presentation?: ModalPresentation;
};

/**
 * 响应式弹层：移动/平板 Bottom Sheet，桌面居中 Dialog。
 * 请优先使用 {@link AppModal}；本组件供内部与兼容导出。
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
  tier = "standard",
  presentation = "auto",
}: ResponsiveSheetProps) {
  const preferSheet = usePreferBottomSheet(tier);
  const useSheet =
    presentation === "sheet" || (presentation === "auto" && preferSheet);
  const [lockedUseSheet, setLockedUseSheet] = useState(useSheet);
  const { level, enabled } = useMotionConfig();
  const modal = modalTransition(level);

  useEffect(() => {
    if (open) return;
    setLockedUseSheet(useSheet);
  }, [open, useSheet]);

  if (lockedUseSheet) {
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
    <ModalDialog
      open={open}
      onClose={onClose}
      closeOnOverlay={closeOnOverlay}
      showCloseButton={showCloseButton}
      hasTitle={Boolean(title)}
      hasDescription={Boolean(description)}
      className={cn(
        "max-h-[min(85vh,720px)]",
        tier === "light" ? "max-w-sm" : "sm:max-w-lg",
        dialogClassName,
      )}
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
    </ModalDialog>
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
  children?: ReactNode;
}) {
  return (
    <>
      {title || description ? (
        <ModalDialogHeader className="shrink-0 space-y-1 border-b border-[var(--theme-border)]">
          {title ? <ModalDialogTitle>{title}</ModalDialogTitle> : null}
          {description ? <ModalDialogDescription>{description}</ModalDialogDescription> : null}
        </ModalDialogHeader>
      ) : null}
      {children ? (
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4",
            !stickyFooter && "pb-5",
          )}
        >
          {children}
        </div>
      ) : null}
      {footer ? (
        <div className="shrink-0 border-t border-[var(--theme-border)] px-5 py-4">{footer}</div>
      ) : null}
    </>
  );
}

export type { BottomSheetHeight };
