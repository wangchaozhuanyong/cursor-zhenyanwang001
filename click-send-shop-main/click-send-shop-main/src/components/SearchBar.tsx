import { Search, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onFocus?: () => void;
  onSubmit?: () => void;
  debounceMs?: number;
  className?: string;
}

export default function SearchBar({
  placeholder = "搜索商品...",
  value: controlledValue,
  onChange,
  onSearch,
  onFocus,
  onSubmit,
  debounceMs = 300,
  className,
}: SearchBarProps) {
  const [draftValue, setDraftValue] = useState(controlledValue ?? "");
  const timerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const value = draftValue;

  useEffect(() => {
    if (controlledValue !== undefined) {
      setDraftValue(controlledValue);
    }
  }, [controlledValue]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const emitChange = (nextValue: string, immediate = false) => {
    if (!onChange) return;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (immediate || debounceMs <= 0) {
      onChange(nextValue);
      return;
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      onChange(nextValue);
    }, debounceMs);
  };

  const setValue = (nextValue: string, immediate = false) => {
    setDraftValue(nextValue);
    emitChange(nextValue, immediate);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      emitChange(value, true);
      onSearch?.(value);
      onSubmit?.();
    }
  };

  return (
    <div
      className={cn(
        "app-search-bar flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 shadow-sm transition-[border-color,box-shadow,background-color]",
        "focus-within:border-[var(--theme-primary)] focus-within:ring-2 focus-within:ring-[var(--theme-primary)]/20",
        className,
      )}
    >
      <Search size={16} className="app-search-bar__icon shrink-0 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        placeholder={placeholder}
        className="app-search-bar__input min-h-0 flex-1 bg-transparent text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground"
      />
      {value && (
        <UnifiedButton type="button" className="app-search-bar__clear touch-manipulation flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary active:bg-muted" onClick={() => setValue("", true)} aria-label="清除">
          <X size={16} className="text-muted-foreground" />
        </UnifiedButton>
      )}
    </div>
  );
}
