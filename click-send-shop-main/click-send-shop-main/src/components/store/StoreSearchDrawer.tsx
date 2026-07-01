import { lazy, Suspense } from "react";
import { Search } from "lucide-react";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import type { StoreSearchCategoryOption, StoreSearchTagOption } from "@/components/store/storeSearchOptions";
import { STORE_COPY } from "@/constants/storeCopy";
import { cn } from "@/lib/utils";

const StoreSearchDrawerPanel = lazy(() => import("@/components/store/StoreSearchDrawerPanel"));

type StoreSearchLauncherProps = {
  value?: string;
  placeholder?: string;
  className?: string;
  onClick: () => void;
};

export type StoreSearchDrawerProps = {
  open: boolean;
  value?: string;
  placeholder?: string;
  categories?: StoreSearchCategoryOption[];
  tags?: StoreSearchTagOption[];
  onClose: () => void;
  onSubmit: (value: string) => void;
  onValueChange?: (value: string) => void;
  onClear?: () => void;
};

export function StoreSearchLauncher({
  value,
  placeholder = STORE_COPY.searchPlaceholder,
  className,
  onClick,
}: StoreSearchLauncherProps) {
  const displayValue = value?.trim() || placeholder;

  return (
    <UnifiedButton
      type="button"
      className={cn("sf-next-store-search-launcher", value?.trim() && "has-value", className)}
      onClick={onClick}
      aria-label={`打开搜索：${displayValue}`}
    >
      <Search size={18} aria-hidden />
      <span>{displayValue}</span>
    </UnifiedButton>
  );
}

export function StoreSearchDrawer(props: StoreSearchDrawerProps) {
  if (!props.open) return null;

  return (
    <Suspense fallback={null}>
      <StoreSearchDrawerPanel {...props} />
    </Suspense>
  );
}
