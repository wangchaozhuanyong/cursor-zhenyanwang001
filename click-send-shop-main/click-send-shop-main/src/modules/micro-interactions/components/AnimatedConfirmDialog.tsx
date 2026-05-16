import type { ReactNode } from "react";
import { BottomSheetConfirm } from "./BottomSheetConfirm";

export type AnimatedConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
};

/** 兼容旧名：内部走 ResponsiveSheet（移动 Bottom / 桌面 Dialog） */
export function AnimatedConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText,
  danger,
  onConfirm,
}: AnimatedConfirmDialogProps) {
  return (
    <BottomSheetConfirm
      open={open}
      onClose={() => onOpenChange(false)}
      title={title}
      description={description}
      confirmText={confirmText}
      cancelText={cancelText}
      danger={danger}
      onConfirm={onConfirm}
    />
  );
}

export default AnimatedConfirmDialog;
