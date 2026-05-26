import type { ReactNode } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LoadingButton } from "./LoadingButton";
import { AppModal } from "./AppModal";

export type BottomSheetConfirmProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function BottomSheetConfirm({
  open,
  onClose,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  danger = false,
  loading: loadingProp,
  onConfirm,
}: BottomSheetConfirmProps) {
  const [busy, setBusy] = useState(false);
  const loading = loadingProp ?? busy;

  const handleConfirm = async () => {
    if (loading) return;
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };
  const handleClose = () => {
    if (!loading) onClose();
  };

  const footer = (
    <motion.div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={onClose}
        className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 text-sm font-semibold text-[var(--theme-text)] transition hover:bg-[var(--theme-bg)] disabled:opacity-50"
      >
        {cancelText}
      </button>
      <LoadingButton
        state={loading ? "loading" : "normal"}
        className={cn(
          "min-h-12 w-full rounded-full text-sm font-semibold",
          danger
            ? "!bg-[var(--theme-danger)] !text-[var(--theme-danger-foreground)]"
            : "!bg-[var(--theme-primary)] !text-[var(--theme-primary-foreground)]",
        )}
        onClick={() => void handleConfirm()}
        loadingText={confirmText}
      >
        {confirmText}
      </LoadingButton>
    </motion.div>
  );

  return (
    <AppModal
      tier="light"
      open={open}
      onClose={handleClose}
      title={title}
      description={description}
      footer={footer}
      height="auto"
      stickyFooter
      showHandle={false}
      closeOnOverlay={!loading}
    />
  );
}