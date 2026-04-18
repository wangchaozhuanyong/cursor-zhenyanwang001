import { Search, X } from "lucide-react";
import { useState } from "react";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onFocus?: () => void;
  onSubmit?: () => void;
}

export default function SearchBar({ placeholder = "搜索商品...", value: controlledValue, onChange, onSearch, onFocus, onSubmit }: SearchBarProps) {
  const [internal, setInternal] = useState("");
  const value = controlledValue ?? internal;
  const setValue = onChange ?? setInternal;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch?.(value);
      onSubmit?.();
    }
  };

  return (
    <div className="flex min-h-[48px] items-center gap-2 rounded-full bg-secondary px-4 py-2.5">
      <Search size={18} className="shrink-0 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        placeholder={placeholder}
        className="min-h-[44px] flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
      />
      {value && (
        <button type="button" className="touch-manipulation flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:bg-muted" onClick={() => setValue("")} aria-label="清除">
          <X size={18} className="text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
