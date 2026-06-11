import { Search } from "lucide-react";
import { STORE_COPY } from "@/constants/storeCopy";
import { cn } from "@/lib/utils";

type StoreSearchFieldProps = {
  mode: "navigate" | "filter";
  size?: "default" | "compact";
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onNavigate?: () => void;
  /** filter 模式下按 Enter 触发 */
  onSubmit?: () => void;
  showSubmitButton?: boolean;
  submitButtonLabel?: string;
  submitOnly?: boolean;
  autoFocus?: boolean;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
};

const baseFieldClass =
  "store-search-field w-full rounded-full border border-[var(--store-border)] bg-[color-mix(in_srgb,var(--store-surface-raised)_88%,transparent)] py-0 text-sm leading-none shadow-[inset_0_1px_0_color-mix(in_srgb,white_42%,transparent)] focus:border-[var(--theme-price)] focus:outline-none";

const fieldSizeClass = {
  default: "h-[2.625rem] min-h-[2.625rem] pl-9 pr-3.5",
  compact: "!h-9 !min-h-9 pl-8 pr-3 text-[13px]",
};

const fieldWithButtonSizeClass = {
  default: "pr-[3.05rem]",
  compact: "pr-[2.65rem]",
};

const iconSizeClass = {
  default: "left-3",
  compact: "left-2.5",
};

const iconClass = {
  default: "h-4 w-4",
  compact: "h-3.5 w-3.5",
};

export default function StoreSearchField({
  mode,
  size = "default",
  placeholder = STORE_COPY.searchPlaceholder,
  value = "",
  onValueChange,
  onNavigate,
  onSubmit,
  showSubmitButton = false,
  submitButtonLabel = "搜索",
  submitOnly = false,
  autoFocus,
  className,
  onFocus,
  onBlur,
}: StoreSearchFieldProps) {
  const canEdit = mode === "filter" || submitOnly;
  const handleSubmit = () => {
    if (mode === "navigate" && !submitOnly) {
      onNavigate?.();
      return;
    }
    onSubmit?.();
  };

  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <div className={cn("pointer-events-none absolute inset-y-0 flex items-center", iconSizeClass[size])} aria-hidden>
        <Search className={cn(iconClass[size], "text-[color-mix(in_srgb,var(--theme-text-on-surface)_72%,var(--theme-text-muted))]")} />
      </div>
      <input
        type="search"
        readOnly={!canEdit}
        value={canEdit ? value : undefined}
        placeholder={placeholder}
        onChange={canEdit ? (e) => onValueChange?.(e.target.value) : undefined}
        onKeyDown={
          canEdit && onSubmit
            ? (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }
            : undefined
        }
        onFocus={() => {
          if (mode === "navigate" && !submitOnly) onNavigate?.();
          onFocus?.();
        }}
        onBlur={onBlur}
        onClick={mode === "navigate" && !submitOnly ? onNavigate : undefined}
        autoFocus={canEdit ? autoFocus : undefined}
        className={cn(
          baseFieldClass,
          fieldSizeClass[size],
          showSubmitButton && "store-search-field--with-submit",
          showSubmitButton && fieldWithButtonSizeClass[size],
          mode === "navigate" && !submitOnly && "cursor-pointer",
        )}
        aria-label={placeholder}
      />
      {showSubmitButton ? (
        <button
          type="button"
          onClick={handleSubmit}
          aria-label={submitButtonLabel}
          className={cn(
            "store-search-submit-button absolute right-1 top-1/2 inline-flex shrink-0 -translate-y-1/2 items-center justify-center rounded-full border border-transparent bg-[var(--theme-price)] text-[var(--theme-price-foreground)] shadow-sm transition active:scale-95",
            size === "compact" ? "h-7 w-7" : "h-8 w-8",
          )}
        >
          <Search className={size === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </button>
      ) : null}
    </div>
  );
}
