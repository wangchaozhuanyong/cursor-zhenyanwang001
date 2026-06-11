import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { AppModalTier, BottomSheetHeight } from "@/modules/micro-interactions";
import { cn } from "@/lib/utils";
import { AdminFormSheet } from "./AdminFormSheet";
import type { AdminResponsiveSheetSize } from "./AdminResponsiveSheet";

export type AdminInputSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  placeholder?: string;
  submitText?: string;
  cancelText?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  defaultValue?: string;
  size?: AdminResponsiveSheetSize;
  height?: BottomSheetHeight;
  tier?: AppModalTier;
  className?: string;
  onSubmit: (value: string) => void | Promise<void>;
};

/** 管理端文本输入弹层（替代 window.prompt） */
export function AdminInputSheet({
  open,
  onOpenChange,
  title,
  description,
  placeholder = "请输入",
  submitText = "确认",
  cancelText = "取消",
  required = true,
  multiline = true,
  rows = 3,
  defaultValue = "",
  size = "sm",
  height = "auto",
  tier = "light",
  className,
  onSubmit,
}: AdminInputSheetProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setError(null);
    }
  }, [open, defaultValue]);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (required && !trimmed) {
      setError("请填写内容");
      return;
    }
    setError(null);
    await onSubmit(trimmed);
  };

  const inputClass =
    "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-[color-mix(in_srgb,var(--theme-primary)_50%,var(--theme-border))] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--theme-primary)_20%,transparent)]";

  return (
    <AdminFormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      submitText={submitText}
      cancelText={cancelText}
      onSubmit={handleSubmit}
      size={size}
      height={height}
      tier={tier}
      className={cn("admin-input-sheet max-w-sm", className)}
    >
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder={placeholder}
          rows={rows}
          className={`${inputClass} resize-none`}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder={placeholder}
          className={inputClass}
        />
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </AdminFormSheet>
  );
}
