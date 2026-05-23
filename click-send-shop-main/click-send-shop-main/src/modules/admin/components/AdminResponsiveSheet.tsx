import type { ReactNode } from "react";
import { ResponsiveSheet, type BottomSheetHeight } from "@/modules/micro-interactions";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-3xl",
} as const;

export type AdminResponsiveSheetSize = keyof typeof SIZE_CLASS;

export type AdminResponsiveSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: AdminResponsiveSheetSize;
  height?: BottomSheetHeight;
  stickyFooter?: boolean;
  showCloseButton?: boolean;
  closeOnOverlay?: boolean;
};

/** 管理端弹层：移动端 Bottom Sheet，桌面端居中 Dialog（与 C 端 ResponsiveSheet 一致） */
export function AdminResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  height = "auto",
  stickyFooter,
  showCloseButton = true,
  closeOnOverlay = true,
}: AdminResponsiveSheetProps) {
  return (
    <ResponsiveSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title={title}
      description={description}
      footer={footer}
      height={height}
      stickyFooter={stickyFooter ?? Boolean(footer)}
      showCloseButton={showCloseButton}
      closeOnOverlay={closeOnOverlay}
      dialogClassName={cn(
        SIZE_CLASS[size],
        "border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]",
      )}
    >
      {children}
    </ResponsiveSheet>
  );
}
