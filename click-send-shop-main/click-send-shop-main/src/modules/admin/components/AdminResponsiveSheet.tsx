import type { ReactNode } from "react";
import { AppModal, type AppModalTier, type BottomSheetHeight } from "@/modules/micro-interactions";
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
  className?: string;
  stickyFooter?: boolean;
  showCloseButton?: boolean;
  closeOnOverlay?: boolean;
  /** 弹层档位，表单场景建议 form */
  tier?: AppModalTier;
};

/** 管理端弹层：移动/平板 Bottom Sheet，桌面居中 Dialog（全局 AppModal） */
export function AdminResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  height = "auto",
  className,
  stickyFooter,
  showCloseButton = true,
  closeOnOverlay = true,
  tier = "standard",
}: AdminResponsiveSheetProps) {
  return (
    <AppModal
      tier={tier}
      open={open}
      onClose={() => onOpenChange(false)}
      title={title}
      description={description}
      footer={footer}
      height={height}
      stickyFooter={stickyFooter ?? Boolean(footer)}
      showCloseButton={showCloseButton}
      closeOnOverlay={closeOnOverlay}
      className={cn("admin-responsive-sheet", className)}
      dialogClassName={cn(
        "admin-responsive-sheet",
        SIZE_CLASS[size],
        "border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]",
        className,
      )}
    >
      {children}
    </AppModal>
  );
}
