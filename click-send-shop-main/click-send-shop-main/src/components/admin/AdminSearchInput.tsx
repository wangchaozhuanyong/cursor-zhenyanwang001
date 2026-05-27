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
    <div className={cn("relative", containerClassName)}>
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
          "min-h-[42px] w-full rounded-lg border border-border bg-background pr-3 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground",
          showIcon ? "pl-9" : "pl-3",
          className,
        )}
      />
    </div>
  );
}
