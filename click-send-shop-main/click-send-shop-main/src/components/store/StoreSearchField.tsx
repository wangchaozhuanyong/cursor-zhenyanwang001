import { Search } from "lucide-react";
import { STORE_COPY } from "@/constants/storeCopy";
import { cn } from "@/lib/utils";

type StoreSearchFieldProps = {
  mode: "navigate" | "filter";
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onNavigate?: () => void;
  /** filter 模式下按 Enter 触发 */
  onSubmit?: () => void;
  autoFocus?: boolean;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
};

const fieldClass =
  "h-[2.625rem] min-h-[2.625rem] w-full rounded-full border border-[var(--store-border)] bg-[color-mix(in_srgb,var(--store-surface-raised)_88%,transparent)] py-0 pl-9 pr-3.5 text-sm leading-none text-[var(--theme-text)] shadow-[inset_0_1px_0_color-mix(in_srgb,white_42%,transparent)] placeholder:text-[var(--theme-text-muted)] focus:border-[var(--theme-price)] focus:outline-none";

export default function StoreSearchField({
  mode,
  placeholder = STORE_COPY.searchPlaceholder,
  value = "",
  onValueChange,
  onNavigate,
  onSubmit,
  autoFocus,
  className,
  onFocus,
  onBlur,
}: StoreSearchFieldProps) {
  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center" aria-hidden>
        <Search className="h-4 w-4 text-[color-mix(in_srgb,var(--theme-text-on-surface)_72%,var(--theme-text-muted))]" />
      </div>
      <input
        type="search"
        readOnly={mode === "navigate"}
        value={mode === "filter" ? value : undefined}
        placeholder={placeholder}
        onChange={mode === "filter" ? (e) => onValueChange?.(e.target.value) : undefined}
        onKeyDown={
          mode === "filter" && onSubmit
            ? (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSubmit();
                }
              }
            : undefined
        }
        onFocus={() => {
          if (mode === "navigate") onNavigate?.();
          onFocus?.();
        }}
        onBlur={onBlur}
        onClick={mode === "navigate" ? onNavigate : undefined}
        autoFocus={mode === "filter" ? autoFocus : undefined}
        className={cn(fieldClass, mode === "navigate" && "cursor-pointer")}
        aria-label={placeholder}
      />
    </div>
  );
}
