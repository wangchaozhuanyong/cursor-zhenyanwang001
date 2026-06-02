import { useState, type ReactNode } from "react";
import { Filter } from "lucide-react";
import { AppModal } from "@/modules/micro-interactions";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

interface ProductFilterDrawerProps {
  activeFilterCount: number;
  onReset: () => void;
  onConfirm?: () => boolean | void;
  children: ReactNode;
}

export default function ProductFilterDrawer({ activeFilterCount, onReset, onConfirm, children }: ProductFilterDrawerProps) {
  const [open, setOpen] = useState(false);

  const footer = (
    <div className="grid grid-cols-2 gap-2">
      <UnifiedButton
        type="button"
        onClick={onReset}
        className="store-filter-reset-button w-full rounded-xl border px-3 py-3 text-sm font-semibold transition active:scale-[0.98]"
      >
        清空筛选
      </UnifiedButton>
      <UnifiedButton
        type="button"
        onClick={() => {
          const ok = onConfirm?.();
          if (ok === false) return;
          setOpen(false);
        }}
        className="store-filter-confirm-button w-full rounded-xl px-3 py-3 text-sm font-semibold transition active:scale-[0.98]"
      >
        确认筛选
      </UnifiedButton>
    </div>
  );

  return (
    <>
      <UnifiedButton
        type="button"
        onClick={() => setOpen(true)}
        className="store-category-filter-button inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
      >
        <Filter size={14} />
        筛选
        {activeFilterCount > 0 ? (
          <span className="rounded-full bg-[var(--theme-price)] px-1.5 py-0.5 text-[10px] leading-none text-[var(--theme-price-foreground)]">
            {activeFilterCount}
          </span>
        ) : null}
      </UnifiedButton>

      <AppModal
        tier="standard"
        open={open}
        onClose={() => setOpen(false)}
        title="筛选商品"
        height="90vh"
        stickyFooter
        footer={footer}
      >
        <div className="space-y-4 pb-2">{children}</div>
      </AppModal>
    </>
  );
}
