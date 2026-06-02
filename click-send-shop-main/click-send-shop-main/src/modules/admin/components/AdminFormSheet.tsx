import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { LoadingButton } from "@/modules/micro-interactions";
import { AdminResponsiveSheet, type AdminResponsiveSheetSize } from "./AdminResponsiveSheet";

export type AdminFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  submitDisabled?: boolean;
  danger?: boolean;
  size?: AdminResponsiveSheetSize;
  onSubmit: () => void | Promise<void>;
};

/** 管理端表单弹层：取消 + 主操作，布局与 C 端 BottomSheetConfirm 一致 */
export function AdminFormSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  submitText = "确认",
  cancelText = "取消",
  loading: loadingProp,
  submitDisabled = false,
  danger = false,
  size = "md",
  onSubmit,
}: AdminFormSheetProps) {
  const [busy, setBusy] = useState(false);
  const loading = loadingProp ?? busy;

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    try {
      await onSubmit();
      onOpenChange(false);
    } catch {
      // Keep the sheet open. Callers usually show the concrete error message.
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <div className="admin-sheet-footer-actions grid grid-cols-2 gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => onOpenChange(false)}
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 text-sm font-medium text-foreground transition hover:bg-secondary disabled:opacity-50"
      >
        {cancelText}
      </button>
      <LoadingButton
        type="button"
        state={loading ? "loading" : "normal"}
        disabled={submitDisabled}
        className={cn(
          "min-h-11 w-full rounded-lg text-sm font-semibold",
          danger
            ? "!bg-destructive !text-destructive-foreground"
            : "btn-theme-price !text-primary-foreground",
        )}
        onClick={() => void handleSubmit()}
        loadingText={submitText}
      >
        {submitText}
      </LoadingButton>
    </div>
  );

  return (
    <AdminResponsiveSheet
      tier="form"
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={footer}
      size={size}
      height="70vh"
      stickyFooter
    >
      <form className="admin-form-sheet-form space-y-3" onSubmit={(e) => void handleSubmit(e)}>
        {children}
      </form>
    </AdminResponsiveSheet>
  );
}
