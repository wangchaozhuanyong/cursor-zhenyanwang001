import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ResponsiveSheet } from "./ResponsiveSheet";
import type { BottomSheetHeight } from "./BottomSheet";

export type BottomSheetPickerItem<T extends string = string> = {
  value: T;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
};

export type BottomSheetPickerProps<T extends string = string> = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  items: BottomSheetPickerItem<T>[];
  selectedValue: T | null;
  onChange: (value: T) => void;
  renderItem?: (item: BottomSheetPickerItem<T>, selected: boolean) => ReactNode;
  confirmText?: string;
  onConfirm?: () => void;
  height?: BottomSheetHeight;
};

export function BottomSheetPicker<T extends string = string>({
  open,
  onClose,
  title,
  description,
  items,
  selectedValue,
  onChange,
  renderItem,
  confirmText = "确定",
  onConfirm,
  height = "70vh",
}: BottomSheetPickerProps<T>) {
  const handlePick = (value: T) => {
    onChange(value);
    if (!onConfirm) onClose();
  };

  const footer = onConfirm ? (
    <button
      type="button"
      onClick={() => {
        onConfirm();
        onClose();
      }}
      className="flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--theme-primary)] text-sm font-semibold text-[var(--theme-primary-foreground)]"
    >
      {confirmText}
    </button>
  ) : undefined;

  return (
    <ResponsiveSheet
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={footer}
      height={height}
      stickyFooter={Boolean(footer)}
    >
      <ul className="space-y-2 pb-2">
        {items.map((item) => {
          const selected = item.value === selectedValue;
          if (renderItem) {
            return (
              <li key={item.value}>
                <button
                  type="button"
                  disabled={item.disabled}
                  className="w-full text-left disabled:opacity-45"
                  onClick={() => !item.disabled && handlePick(item.value)}
                >
                  {renderItem(item, selected)}
                </button>
              </li>
            );
          }
          return (
            <li key={item.value}>
              <motion.button
                type="button"
                disabled={item.disabled}
                whileTap={item.disabled ? undefined : { scale: 0.98 }}
                onClick={() => !item.disabled && handlePick(item.value)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
                  selected
                    ? "border-[var(--theme-primary)] bg-[color-mix(in_srgb,var(--theme-primary)_10%,transparent)]"
                    : "border-[var(--theme-border)] bg-[var(--theme-bg)] hover:border-[var(--theme-primary)]/40",
                  item.disabled && "cursor-not-allowed opacity-45",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[var(--theme-text)]">{item.label}</span>
                  {item.description ? (
                    <span className="mt-0.5 block text-xs text-[var(--theme-text-muted)]">{item.description}</span>
                  ) : null}
                </span>
                {selected ? (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]">
                    <Check size={14} strokeWidth={3} />
                  </span>
                ) : null}
              </motion.button>
            </li>
          );
        })}
      </ul>
    </ResponsiveSheet>
  );
}
