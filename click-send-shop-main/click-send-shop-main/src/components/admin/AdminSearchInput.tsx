import type { ComponentProps } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type AdminSearchInputProps = Omit<ComponentProps<"input">, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  containerClassName?: string;
  iconClassName?: string;
  iconSize?: number;
  showIcon?: boolean;
};

export default function AdminSearchInput({
  value,
  onChange,
  containerClassName,
  className,
  iconClassName,
  iconSize = 15,
  showIcon = true,
  ...props
}: AdminSearchInputProps) {
  return (
    <div className={cn("relative min-w-0 max-w-full", containerClassName)}>
      {showIcon ? (
        <Search
          size={iconSize}
          className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", iconClassName)}
        />
      ) : null}
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "admin-search-input-field min-h-[44px] w-full min-w-0 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] pr-3 text-sm leading-5 text-[var(--theme-text-on-surface)] outline-none placeholder:text-muted-foreground shadow-sm",
          "transition-[border-color,box-shadow,background-color] focus-visible:border-[var(--theme-primary)] focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]/20 disabled:cursor-not-allowed disabled:opacity-55",
          showIcon ? "pl-10" : "pl-3.5",
          className,
        )}
      />
    </div>
  );
}
